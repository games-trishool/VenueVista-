import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(target)) {
  console.log('Preserved existing .env. Review it locally if configuration needs to change.');
} else {
  const password = randomBytes(24).toString('hex');
  const secret = randomBytes(48).toString('hex');
  writeFileSync(
    target,
    [
      '# Generated for local development only. Never use these settings in production.',
      'POSTGRES_USER=venuevista',
      `POSTGRES_PASSWORD=${password}`,
      'POSTGRES_DB=venuevista',
      'POSTGRES_PORT=5433',
      `DATABASE_URL=postgresql://venuevista:${password}@127.0.0.1:5433/venuevista?schema=public`,
      `TEST_DATABASE_URL=postgresql://venuevista:${password}@127.0.0.1:5433/venuevista_test?schema=public`,
      `AUTH_JWT_SECRET=${secret}`,
      'ENABLE_DEV_AUTH=true',
      'ADMIN_ENABLE_DEV_AUTH=true',
      'EXPO_PUBLIC_ENABLE_DEV_AUTH=true',
      'API_URL=http://127.0.0.1:4000/api/v1',
      'EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1',
      'CORS_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:8082',
      'MEDIA_STORAGE_PATH=/tmp/venuevista-uploads',
      'PUBLIC_API_URL=http://localhost:4000',
      'PORT=4000',
      'HOST=127.0.0.1',
      '',
    ].join('\n'),
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Created private .env with generated local credentials and explicit development sign-in. Values withheld.',
  );
}
