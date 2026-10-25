/**
 * Transactional SQL migrations for PostgreSQL/PostGIS.
 * Keep this ledger separate from Prisma Migrate: never run both against one DB.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const migrationRoot = join(__dirname, 'migrations');
const ledger = '"_venuevista_migrations"';

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Load the repository .env first.');
  const directories = await readdir(migrationRoot, { withFileTypes: true });
  if (directories.some((entry) => entry.isSymbolicLink())) {
    throw new Error('Migration directory symlinks are unsupported. Commit migration SQL directly.');
  }
  const migrations = await Promise.all(
    directories
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .map(async (entry) => {
        if (!/^\d{14}_[a-z0-9_]+$/.test(entry.name)) {
          throw new Error(`Invalid migration directory name: ${entry.name}`);
        }
        const sql = await readFile(join(migrationRoot, entry.name, 'migration.sql'), 'utf8');
        if (!sql.trim()) throw new Error(`Empty migration: ${entry.name}`);
        const checksum = createHash('sha256').update(sql).digest('hex');
        return { name: entry.name, sql, checksum };
      }),
  );
  if (migrations.length === 0) throw new Error('No checked-in SQL migrations found.');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  let connected = false;
  let inTransaction = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN');
    inTransaction = true;
    // The same key is used on every invocation; concurrent deploys serialize.
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [824250, 1]);

    const nativeLedger = await client.query<{ ledger: string | null }>(
      `SELECT to_regclass('public._prisma_migrations')::text AS ledger`,
    );
    if (nativeLedger.rows[0]?.ledger) {
      const nativeApplied = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
      );
      if (Number(nativeApplied.rows[0]?.count) > 0) {
        throw new Error(
          'This database has Prisma Migrate history. Refusing to mix migration ledgers; reconcile explicitly before continuing.',
        );
      }
    }

    await client.query(`CREATE TABLE IF NOT EXISTS ${ledger} (
      "name" text PRIMARY KEY,
      "checksum" char(64) NOT NULL,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    )`);
    const history = await client.query<{ name: string; checksum: string }>(
      `SELECT "name", "checksum" FROM ${ledger} ORDER BY "name"`,
    );
    const known = new Map(history.rows.map((entry) => [entry.name, entry.checksum]));
    const files = new Set(migrations.map((entry) => entry.name));
    for (const recorded of known.keys()) {
      if (!files.has(recorded))
        throw new Error(`Applied migration is missing from source: ${recorded}`);
    }

    const lastApplied = history.rows.at(-1)?.name;
    for (const migration of migrations) {
      if (!known.has(migration.name) && lastApplied && migration.name < lastApplied) {
        throw new Error(
          `New migration ${migration.name} predates applied history; create a new timestamped migration instead.`,
        );
      }
    }

    let applied = 0;
    for (const migration of migrations) {
      const existing = known.get(migration.name);
      if (existing) {
        if (existing !== migration.checksum) {
          throw new Error(
            `Checksum mismatch for applied migration ${migration.name}; restore its original SQL and add a new migration.`,
          );
        }
        continue;
      }
      await client.query(migration.sql);
      await client.query(`INSERT INTO ${ledger} ("name", "checksum") VALUES ($1, $2)`, [
        migration.name,
        migration.checksum,
      ]);
      applied += 1;
      console.log(`Executed SQL migration ${migration.name} (transaction pending)`);
    }
    await client.query('COMMIT');
    inTransaction = false;
    console.log(
      applied === 0
        ? 'Database is current; all migration checksums match.'
        : `Committed ${applied} SQL migration(s).`,
    );
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    if (connected) await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Database migration failed.');
  process.exitCode = 1;
});
