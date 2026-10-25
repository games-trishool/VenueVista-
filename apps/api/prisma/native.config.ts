import { defineConfig } from 'prisma/config';

/** Stable native migration-engine alternative when binaries.prisma.sh is reachable. */
export default defineConfig({
  schema: './schema.prisma',
  migrations: { path: './migrations' },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
