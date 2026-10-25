# VenueVista

Discover the perfect place for every celebration.

VenueVista is an event-venue discovery and enquiry marketplace for Andhra Pradesh
and Telangana. This monorepo contains separate Customer and Partner Expo apps, a
Next.js administrator dashboard, and a shared NestJS/PostgreSQL API. Listings are
database records created by owners and published after administrator review.
Development fixtures, when explicitly enabled, are not real venue recommendations.

The first implementation focuses on owner submission → administrator approval →
city-filtered customer discovery → enquiry → owner quotation. See the
[implementation checklist](docs/implementation-checklist.md) for work still needed
before a public release. Build success does not establish Play Store readiness or
production security/compliance.

## Repository

```text
apps/
  customer-mobile/    Expo Router, com.venuevista.customer
  partner-mobile/     Expo Router, com.venuevista.partner
  admin-web/          Next.js admin application
  api/                NestJS API, Prisma schema and migrations
packages/
  shared-types/       Shared API contracts
  api-client/         HTTP client
  validation/         Shared validation
  design-tokens/      Brand tokens
  config/             Shared tooling configuration
infrastructure/      Docker, deployment, monitoring
docs/                Architecture, API and release instructions
```

## Local development

Use Node.js 24 LTS, pnpm 11.25.0, and Docker with Compose. Existing cloud tasks
already have isolated checkouts: use the supplied checkout; do not create a Git
worktree unless explicitly requested.

1. Install the committed dependencies and run the local setup helper from the
   repository root:

   ```sh
   pnpm install --frozen-lockfile
   pnpm setup:local
   ```

   The helper creates an ignored local `.env` with newly generated credentials,
   starts PostgreSQL/PostGIS, generates Prisma, applies migrations, and seeds the
   development setup. Existing configuration is preserved. Review the generated
   development-only auth flags before exposing any service. No secrets belong in
   source control.

2. The database can also be started explicitly:

   ```sh
   docker compose --env-file .env -f infrastructure/docker/compose.yaml up -d db
   docker compose --env-file .env -f infrastructure/docker/compose.yaml ps
   ```

   The database binds only to `127.0.0.1:5433` by default. On a managed cloud
   machine without a Docker daemon, use an externally provided PostgreSQL server
   with PostGIS and `btree_gist`; point `DATABASE_URL` at it. Installing a Docker CLI
   alone does not provide a daemon.

3. To refresh database setup separately:

   ```sh
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

   Run commands with the private `.env` variables exported in the invoking shell,
   or use the repository's environment-loading scripts. Never print the full
   environment to diagnose a missing binding. Seeding is development-only; it
   must not be used to fabricate production venues or administrator identities.
   The template `.env.example` defaults development-auth flags to false;
   `setup:local` deliberately enables them only for the isolated local workflow.

4. Start the applications in separate terminals:

   ```sh
   pnpm dev:api
   pnpm dev:admin
   pnpm dev:customer
   pnpm dev:partner
   ```

   Defaults: API 4000; admin 3000; Customer Metro 8081; Partner Metro 8082. Check
   `GET /api/v1/health` on the API and the generated OpenAPI documentation. Only
   use localhost addresses for local validation; this onboarding flow does not
   provide public previews for those addresses.

5. On an Android emulator, set `EXPO_PUBLIC_API_URL` to
   `http://10.0.2.2:4000/api/v1`. A physical device needs the computer's reachable
   LAN address or a configured HTTPS development endpoint. Restart Metro after
   changing public variables. Set `PUBLIC_API_URL` to a device-reachable API origin for images; for LAN devices use `HOST=0.0.0.0` on your private development network. `localhost` on a phone is the phone itself.

### Development authentication

Development personas require explicit opt-in on both server and client:
`ENABLE_DEV_AUTH=true`, `ADMIN_ENABLE_DEV_AUTH=true`, and
`EXPO_PUBLIC_ENABLE_DEV_AUTH=true`. They exist only to exercise isolated local
database workflows. The server must reject this route in production. Never expose
a development API or its tokens on the public Internet. Production phone OTP and
administrator MFA require Firebase configuration and end-to-end validation.

### Verification

```sh
pnpm typecheck
pnpm lint
pnpm test:integration
pnpm build
```

`pnpm test:integration` prepares a separate development test database without dropping data and runs the API suites. `pnpm test` runs unit tests and skips database integration unless `ENABLE_INTEGRATION_TESTS=true` is supplied. Run integration tests against a disposable database. Check that the expected test
cases actually executed; a skipped or zero-test run is not a pass. Current-session
results and unverified device/external-service checks belong in the
[checklist](docs/implementation-checklist.md).

## Documentation

- [Architecture and data model](docs/architecture/overview.md)
- [API usage and authorization](docs/api/README.md)
- [First business workflow](docs/api/acceptance-workflow.md)
- [Deployment runbook](infrastructure/deployment/README.md)
- [Android builds and internal testing](docs/deployment/android.md)
- [Security and privacy release gates](docs/deployment/security.md)
- [Monitoring, backups and recovery](infrastructure/monitoring/README.md)
- [Remaining work and continuation](docs/implementation-checklist.md)

No external service is provisioned by copying `.env.example`. Firebase, storage,
maps, push delivery, monitoring, Google Play accounts, and release signing need
their own configuration and verification.

## Browser acceptance

With the API and admin development server running, export both mobile apps using the root dotenv wrapper, then serve their `dist` directories using `scripts/serve-export.mjs` on ports8081 and8082. Run `pnpm test:e2e`; inside the isolated cloud container set `PLAYWRIGHT_CONTAINER=true`. The six tests use the real API and database, including owner submission, protected admin approval, customer city isolation and enquiry/quotation tracking, denied GPS, slow responses, offline recovery, and invalid filters. They suspend only their own explicitly labelled synthetic listings. See [validation evidence](docs/validation.md) for commands, screenshots, and limits.

### Cloud shell initialization

On this managed machine, keep pnpm/cache writes inside writable workspace paths before running commands:

```sh
export CI=true XDG_CACHE_HOME=/workspace/.cache XDG_DATA_HOME=/workspace/.local/share
export pnpm_config_store_dir=/workspace/.cache/pnpm npm_config_cache=/workspace/.cache/npm
export EXPO_HOME=/workspace/.cache/expo DOCKER_CONFIG=/workspace/.cache/docker
```

These paths are specific to the cloud workspace; normal workstations can use their writable user caches. Redirect long-lived server logs when launching detached processes so a closed terminal/chat output pipe cannot stop them.
