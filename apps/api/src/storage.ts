import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { lstat, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const imageKey = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp)$/;
const mediaTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export class StorageConfigurationError extends Error {}
export class StorageObjectNotFoundError extends Error {}
export class StorageUnavailableError extends Error {}

export interface MediaStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  close(): void;
}

function assertKey(key: string) {
  if (!imageKey.test(key))
    throw new TypeError('Media keys must be server-generated UUID image filenames.');
}

function assertPayload(body: Buffer, contentType: string) {
  if (!body.length || body.length > MAX_MEDIA_BYTES)
    throw new RangeError('Media must be between 1 byte and 8 MiB.');
  if (!mediaTypes.has(contentType)) throw new TypeError('Unsupported media content type.');
}

function missingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const known = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    known.code === 'ENOENT' ||
    known.name === 'NoSuchKey' ||
    known.name === 'NotFound' ||
    known.$metadata?.httpStatusCode === 404
  );
}

class LocalMediaStorage implements MediaStorage {
  constructor(private readonly directory: string) {}
  async put(key: string, body: Buffer, contentType: string) {
    assertKey(key);
    assertPayload(body, contentType);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(this.directory, key), body, { flag: 'wx', mode: 0o600 });
  }
  async read(key: string) {
    assertKey(key);
    try {
      const path = resolve(this.directory, key);
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink())
        throw new StorageObjectNotFoundError('Image not found.');
      if (info.size > MAX_MEDIA_BYTES)
        throw new StorageUnavailableError('Stored image exceeds the media size limit.');
      const body = await readFile(path);
      if (body.length > MAX_MEDIA_BYTES)
        throw new StorageUnavailableError('Stored image exceeds the media size limit.');
      return body;
    } catch (error) {
      if (missingObject(error)) throw new StorageObjectNotFoundError('Image not found.');
      throw error;
    }
  }
  async remove(key: string) {
    assertKey(key);
    try {
      await unlink(resolve(this.directory, key));
    } catch (error) {
      if (!missingObject(error)) throw error;
    }
  }
  close() {}
}

class S3MediaStorage implements MediaStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}
  async put(key: string, body: Buffer, contentType: string) {
    assertKey(key);
    assertPayload(body, contentType);
    // No public-read ACL: every object stays private. The API enforces the
    // listing's current moderation state before reading it for any caller.
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        IfNoneMatch: '*',
      }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
  }
  async read(key: string) {
    assertKey(key);
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(15_000) },
      );
      const body = result.Body;
      if (!body || !(Symbol.asyncIterator in body))
        throw new StorageUnavailableError('Object storage returned no readable image.');
      const stream = body as AsyncIterable<Uint8Array> & { destroy?: () => void };
      if (result.ContentLength !== undefined && result.ContentLength > MAX_MEDIA_BYTES) {
        stream.destroy?.();
        throw new StorageUnavailableError('Stored image exceeds the media size limit.');
      }
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of stream) {
        length += chunk.length;
        if (length > MAX_MEDIA_BYTES) {
          stream.destroy?.();
          throw new StorageUnavailableError('Stored image exceeds the media size limit.');
        }
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks, length);
    } catch (error) {
      if (missingObject(error)) throw new StorageObjectNotFoundError('Image not found.');
      throw error;
    }
  }
  async remove(key: string) {
    assertKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(15_000),
    });
  }
  close() {
    this.client.destroy();
  }
}

/** Server-only configuration. Never import this module from either client app. */
export function createMediaStorage(env: NodeJS.ProcessEnv = process.env): MediaStorage {
  const driver = env.MEDIA_STORAGE_DRIVER ?? 'local';
  if (driver === 'local') {
    if (env.NODE_ENV === 'production')
      throw new StorageConfigurationError(
        'Production media requires MEDIA_STORAGE_DRIVER=s3 and private object storage configuration.',
      );
    return new LocalMediaStorage(resolve(env.MEDIA_STORAGE_PATH ?? '/tmp/venuevista-uploads'));
  }
  if (driver !== 's3')
    throw new StorageConfigurationError('MEDIA_STORAGE_DRIVER must be local or s3.');
  if (!env.S3_REGION || !env.S3_BUCKET)
    throw new StorageConfigurationError('S3_REGION and S3_BUCKET are required for object storage.');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.S3_BUCKET))
    throw new StorageConfigurationError('S3_BUCKET must be a valid bucket name.');
  if (!!env.S3_ACCESS_KEY_ID !== !!env.S3_SECRET_ACCESS_KEY)
    throw new StorageConfigurationError(
      'Provide both S3 credential bindings, or use the server workload identity.',
    );
  let endpoint: string | undefined;
  if (env.S3_ENDPOINT) {
    let url: URL;
    try {
      url = new URL(env.S3_ENDPOINT);
    } catch {
      throw new StorageConfigurationError('S3_ENDPOINT must be an absolute HTTPS URL.');
    }
    const localHttp =
      env.NODE_ENV !== 'production' &&
      env.S3_ALLOW_INSECURE_LOCAL === 'true' &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !localHttp) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      throw new StorageConfigurationError(
        'Object storage requires HTTPS; loopback HTTP needs an explicit non-production S3_ALLOW_INSECURE_LOCAL setting.',
      );
    }
    endpoint = url.toString();
  }
  const credentials =
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          ...(env.S3_SESSION_TOKEN ? { sessionToken: env.S3_SESSION_TOKEN } : {}),
        }
      : undefined;
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint,
    forcePathStyle:
      env.S3_FORCE_PATH_STYLE === 'true' || (!!endpoint && env.S3_FORCE_PATH_STYLE !== 'false'),
    ...(credentials ? { credentials } : {}),
    maxAttempts: 3,
  });
  return new S3MediaStorage(client, env.S3_BUCKET);
}
