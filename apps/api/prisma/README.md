# Database contract

Prisma 6.19 targets PostgreSQL 16 with PostGIS. Business identifiers are UUIDs, money is integer paise, event dates are calendar dates, and appointment/booking instants are timezone-aware timestamps. Location fields and amenity arrays are stored on venues for the initial modular-monolith workflow; pricing packages and policies have additional normalized models.

## Apply migrations

From the repository root with private `.env` configured, run `pnpm db:migrate`. This invokes `prisma/migrate.ts`, a small PostgreSQL SQL migration runner; Prisma remains the application's ORM and client generator.

The runner uses one database transaction, an advisory transaction lock shared by all invocations, sorted checked-in migration folders, SHA-256 SQL checksums, and a dedicated `_venuevista_migrations` ledger. A failed SQL statement rolls the transaction back without marking any migration applied. Repeated runs verify history and apply only new migration folders. Changed or missing applied migrations cause an error. Never edit applied migration SQL; add a new timestamped migration instead.

Do not run Prisma Migrate deployment against this database or manually populate `_prisma_migrations`. The runner refuses a database with successful native Prisma Migrate history. Migrating an existing database from one ledger to the other requires explicit reconciliation and backup; no automatic reset or migration-history repair is performed.

The initial migration creates the PostGIS and btree_gist extensions. Provision those extensions with an administrative migration connection when the deployment application role lacks extension creation privileges. Use a less privileged application connection after migration. SQL files must be transaction-compatible; operations such as `CREATE INDEX CONCURRENTLY` require a separately reviewed deployment process.

## Integrity and geospatial queries

`Venue.location` is synchronized by a trigger from longitude/latitude, including raw SQL writes. A GiST index supports radius and distance queries. Only approved, nondeleted venues may be served publicly; that authorization predicate is enforced in the API.

The booking GiST exclusion constraint rejects overlapping confirmed intervals for the same independently bookable space even under concurrency. Intervals use `[start,end)` semantics: adjacent reservations are legal. Foreign keys include the venue/space pair so a booking, enquiry, block, or availability entry cannot reference a different venue's space. A partial unique index prevents duplicate venue-wide availability for the same date. Database checks enforce nonnegative money/capacity, valid geographic coordinates, nonempty booking intervals, and review rating bounds.

`sql/extensions.sql` and `sql/invariants.sql` are readable fragments incorporated into the initial migration. They are not independent migrations and must not be applied twice.

## Development identities and checks

`seed.ts` creates explicit **development identities and a development organization only** when `ENABLE_DEV_AUTH=true` and `NODE_ENV` is not production. It never inserts a venue, review, rating, price, or availability. Backend development sessions use the same `dev:owner`, `dev:customer`, and `dev:admin` identity keys. Seed runs are idempotent.

Run `psql -v ON_ERROR_STOP=1 -f prisma/verify-invariants.sql` from `apps/api` with a development database connection to check actual PostgreSQL constraints and triggers. Fixtures run inside a rolled-back transaction, leaving no test catalogue records.

Additional pricing/package/policy, review, verification, block, notification, and platform-setting models support later features. A model's presence does not establish that its management UI or API exists. Consult the implementation checklist.

## Prisma engine choice and migration authoring

The application uses Prisma's generally available JavaScript query engine (`engineType = "client"`) with the official PostgreSQL driver adapter. Generated clients do not need native query-engine downloads.

`prisma/config.ts` selects Prisma 6.19's **experimental CLI WASM schema-engine/adapter integration** for schema validation, client generation, and initial SQL diff generation. Those operations have been exercised. Its `migrate deploy` path fails on PostgreSQL's builtin `name` data type in this pinned version, which is why production migration execution uses the transaction-protected SQL runner above.

`prisma/native.config.ts` supplies the stable native schema-engine alternative for migration authoring/diff commands when verified native downloads from `binaries.prisma.sh` are available. It uses the same schema; do not use it to create a second deployment ledger. Keep TLS and artifact-checksum validation enabled. New migrations require review, staging rehearsal, and a database backup before production.
