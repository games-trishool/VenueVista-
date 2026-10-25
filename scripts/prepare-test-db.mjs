import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_AUTH !== 'true') {
    throw new Error(
      'Test database preparation requires explicit non-production development configuration.',
    );
  }
  if (!process.env.DATABASE_URL || !process.env.TEST_DATABASE_URL) {
    throw new Error('Set DATABASE_URL and a separate TEST_DATABASE_URL in the private .env.');
  }
  const source = new URL(process.env.DATABASE_URL);
  const target = new URL(process.env.TEST_DATABASE_URL);
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-z][a-z0-9_]{0,57}_test$/.test(database))
    throw new Error(
      'The disposable test database name must end in _test and contain only lowercase letters, numbers, and underscores.',
    );
  if (
    source.host !== target.host ||
    source.username !== target.username ||
    source.pathname === target.pathname
  ) {
    throw new Error(
      'The test database must be separate from the application database, on the same development PostgreSQL server and user.',
    );
  }
  const client = new Client({ connectionString: source.toString() });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!found.rowCount) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log('Created the separate disposable development test database.');
    } else console.log('Preserved existing test database.');
  } finally {
    await client.end();
  }
  const migrated = spawnSync(
    fileURLToPath(new URL('../apps/api/node_modules/.bin/tsx', import.meta.url)),
    ['prisma/migrate.ts'],
    {
      cwd: fileURLToPath(new URL('../apps/api/', import.meta.url)),
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: 'inherit',
    },
  );
  if (migrated.error) throw migrated.error;
  if (migrated.status !== 0) process.exitCode = migrated.status ?? 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Test database preparation failed.');
  process.exitCode = 1;
});
