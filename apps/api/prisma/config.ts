import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 6's CLI WASM engine avoids a platform-specific engine binary download.
 * Its adapter integration is explicitly experimental in this pinned CLI version;
 * the Prisma Client JavaScript query engine is generally available.
 * See README.md for the native CLI fallback.
 */
export default defineConfig({
  schema: './schema.prisma',
  migrations: { path: './migrations' },
  experimental: { adapter: true },
  engine: 'js',
  adapter: async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString)
      throw new Error('DATABASE_URL is required. Load the repository .env before running Prisma.');
    return new PrismaPg({ connectionString });
  },
});
