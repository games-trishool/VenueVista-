import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  createMediaStorage,
  MAX_MEDIA_BYTES,
  StorageConfigurationError,
  StorageObjectNotFoundError,
  type MediaStorage,
} from '../src/storage';

describe('Media storage configuration and local persistence', () => {
  let directory: string;
  let local: MediaStorage;
  let image: Buffer;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'venuevista-storage-'));
    local = createMediaStorage({ NODE_ENV: 'test', MEDIA_STORAGE_PATH: directory });
    image = await sharp({ create: { width: 3, height: 3, channels: 3, background: '#7655e8' } })
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    local?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('persists exact sanitized bytes, refuses overwrite, removes and reports missing objects', async () => {
    const key = `${randomUUID()}.png`;
    await local.put(key, image, 'image/png');
    expect(await local.read(key)).toEqual(image);
    await expect(local.put(key, image, 'image/png')).rejects.toMatchObject({ code: 'EEXIST' });
    await local.remove(key);
    await expect(local.read(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
    await expect(local.remove(key)).resolves.toBeUndefined();
  });
  it.each(['../secret.png', '/tmp/photo.png', `${randomUUID()}.svg`, 'photo.png'])(
    'rejects unsafe storage key %s before file access',
    async (key) => {
      await expect(local.put(key, image, 'image/png')).rejects.toThrow(TypeError);
      await expect(local.read(key)).rejects.toThrow(TypeError);
      await expect(local.remove(key)).rejects.toThrow(TypeError);
    },
  );
  it('rejects empty or oversized objects and unsupported content types', async () => {
    const key = `${randomUUID()}.png`;
    await expect(local.put(key, Buffer.alloc(0), 'image/png')).rejects.toThrow(RangeError);
    await expect(local.put(key, Buffer.alloc(MAX_MEDIA_BYTES + 1), 'image/png')).rejects.toThrow(
      RangeError,
    );
    await expect(local.put(key, image, 'image/svg+xml')).rejects.toThrow(TypeError);
  });
  it('fails closed instead of using disk storage in production', () => {
    expect(() => createMediaStorage({ NODE_ENV: 'production' })).toThrow(StorageConfigurationError);
    expect(() =>
      createMediaStorage({ NODE_ENV: 'production', MEDIA_STORAGE_DRIVER: 'local' }),
    ).toThrow(StorageConfigurationError);
  });
  it('rejects unsupported drivers and incomplete S3 configuration', () => {
    expect(() => createMediaStorage({ MEDIA_STORAGE_DRIVER: 'unknown' })).toThrow(
      StorageConfigurationError,
    );
    expect(() => createMediaStorage({ MEDIA_STORAGE_DRIVER: 's3' })).toThrow(
      StorageConfigurationError,
    );
    expect(() =>
      createMediaStorage({
        MEDIA_STORAGE_DRIVER: 's3',
        S3_REGION: 'ap-south-1',
        S3_BUCKET: 'Invalid Bucket',
      }),
    ).toThrow(StorageConfigurationError);
  });
  const s3 = { MEDIA_STORAGE_DRIVER: 's3', S3_REGION: 'ap-south-1', S3_BUCKET: 'venuevista-test' };
  it('refuses partial credential bindings rather than silently falling back', () => {
    expect(() => createMediaStorage({ ...s3, S3_ACCESS_KEY_ID: 'example' })).toThrow(
      StorageConfigurationError,
    );
    expect(() => createMediaStorage({ ...s3, S3_SECRET_ACCESS_KEY: 'example' })).toThrow(
      StorageConfigurationError,
    );
  });
  it.each([
    {
      NODE_ENV: 'production',
      S3_ENDPOINT: 'http://127.0.0.1:9000',
      S3_ALLOW_INSECURE_LOCAL: 'true',
    },
    { NODE_ENV: 'test', S3_ENDPOINT: 'http://127.0.0.1:9000' },
    {
      NODE_ENV: 'test',
      S3_ENDPOINT: 'http://storage.example.com',
      S3_ALLOW_INSECURE_LOCAL: 'true',
    },
    { NODE_ENV: 'production', S3_ENDPOINT: 'https://user:password@storage.example.com' },
    { NODE_ENV: 'production', S3_ENDPOINT: 'https://storage.example.com/path' },
  ])('enforces the storage TLS and endpoint policy (%o)', (env) => {
    expect(() => createMediaStorage({ ...s3, ...env })).toThrow(StorageConfigurationError);
  });
  it('constructs HTTPS workload-identity configuration without claiming remote access', () => {
    const storage = createMediaStorage({
      ...s3,
      NODE_ENV: 'production',
      S3_ENDPOINT: 'https://storage.example.com',
    });
    expect(typeof storage.put).toBe('function');
    storage.close();
  });
});
