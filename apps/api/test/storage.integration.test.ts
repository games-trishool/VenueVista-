import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMediaStorage, StorageObjectNotFoundError, type MediaStorage } from '../src/storage';

// These tests make signed requests to a disposable loopback object service.
// MinIO qualifies bucket privacy; the explicitly labelled S3rver emulator cannot.
// They never enable S3 on the concurrently running API or change its .env file.
describe.skipIf(process.env.ENABLE_STORAGE_INTEGRATION_TESTS !== 'true')(
  `S3-compatible media storage wire protocol (${process.env.STORAGE_TEST_SERVICE || 'minio'})`,
  () => {
    let client: S3Client;
    let storage: MediaStorage;
    let endpoint: URL;
    let bucket: string;
    const keys = new Set<string>();
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    beforeAll(async () => {
      if (process.env.NODE_ENV === 'production')
        throw new Error('Never run storage integration tests in production.');
      endpoint = new URL(process.env.S3_ENDPOINT || '');
      bucket = process.env.S3_BUCKET || '';
      if (
        !['127.0.0.1', 'localhost'].includes(endpoint.hostname) ||
        bucket !== 'venuevista-integration'
      ) {
        throw new Error(
          'Storage integration tests require the isolated loopback object service and venuevista-integration test bucket.',
        );
      }
      if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
        throw new Error(
          'Configure generated local MinIO credentials securely before running this suite.',
        );
      }
      client = new S3Client({
        endpoint: endpoint.toString(),
        region: process.env.S3_REGION || 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      });
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404
        )
          throw error;
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
      storage = createMediaStorage({ ...process.env, MEDIA_STORAGE_DRIVER: 's3' });
    });

    afterAll(async () => {
      if (client) {
        for (const key of keys)
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        client.destroy();
      }
      storage?.close();
    });

    it('persists and retrieves the exact bytes through the S3 adapter', async () => {
      const key = `${randomUUID()}.png`;
      keys.add(key);
      await storage.put(key, image, 'image/png');
      expect(await storage.read(key)).toEqual(image);
      const metadata = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      expect(metadata.ContentType).toBe('image/png');
      expect(metadata.ContentLength).toBe(image.length);
    });

    it.skipIf(process.env.STORAGE_TEST_SERVICE === 's3rver-emulator')(
      'qualifies real-provider private bucket policy by denying anonymous access',
      async () => {
        const key = `${randomUUID()}.png`;
        keys.add(key);
        await storage.put(key, image, 'image/png');
        const anonymous = await fetch(new URL(`${bucket}/${key}`, endpoint));
        expect(anonymous.status).toBe(403);
        await anonymous.body?.cancel();
        expect(await storage.read(key)).toEqual(image);
      },
    );

    it('deletes its own object and reports a missing object explicitly', async () => {
      const key = `${randomUUID()}.png`;
      keys.add(key);
      await storage.put(key, image, 'image/png');
      await storage.remove(key);
      await expect(storage.read(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
      keys.delete(key);
    });

    it('rejects oversized uploads and unsafe keys before storing objects', async () => {
      const key = `${randomUUID()}.png`;
      keys.add(key);
      await expect(
        storage.put(key, Buffer.alloc(8 * 1024 * 1024 + 1), 'image/png'),
      ).rejects.toThrow();
      await expect(
        client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
      ).rejects.toMatchObject({
        $metadata: { httpStatusCode: 404 },
      });
      await expect(storage.put('../outside.png', image, 'image/png')).rejects.toThrow();
      await expect(storage.read('../outside.png')).rejects.toThrow();
      await expect(storage.remove('../outside.png')).rejects.toThrow();
      keys.delete(key);
    });
  },
);
