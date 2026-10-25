# Validation evidence

Checks ran in the actual cloud workspace on2026-10-25. Source is in `/workspace/VenueVista-`. The initial remote was empty; no existing application was overwritten. Source is available on the GitHub `venuevista-mvp` branch for ZIP download. No application has been deployed or environment published.

## Executed checks

| Check                          | Actual result                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locked dependency installation | Node24/pnpm11.25.0; TLS, package integrity and artifact verification retained                                                                                                    |
| `pnpm setup:local`             | Preserved private configuration; PostGIS health wait, Prisma generation, migrations and guarded seed passed                                                                      |
| `pnpm db:test:prepare`         | Separate test database prepared/migrated without dropping data                                                                                                                   |
| Database invariant SQL         | Passed geography synchronization, overlap rejection, adjacency, independent/cancelled bookings, cross-venue references, intervals, availability uniqueness and nonnegative money |
| Migration integrity            | Repeat application passed; deliberate checksum mismatch rejected and exact SQL restored; production seed refused                                                                 |
| TypeScript/ESLint              | All8 workspace typecheck tasks and root lint passed                                                                                                                              |
| API/Admin builds               | NestJS TypeScript and Next16.4.3 production builds passed                                                                                                                        |
| Expo web                       | Both production web exports passed using2 Metro workers each                                                                                                                     |
| Android JavaScript             | Both Hermes bundles compiled with native Firebase adapters resolved; no native binary built                                                                                      |
| API integration run            | 45 passed:12 validation/auth unit,15 storage/local unit,18 real PostgreSQL/PostGIS integration;4 optional storage-wire skipped                                                   |
| Separate storage wire run      | 3 passed against authenticated disk-backed loopback S3rver3.7.1;1 provider-privacy case intentionally skipped because the emulator cannot enforce bucket ACLs                    |
| Browser acceptance             | 6 passed with Chromium, real API/database and no fabricated API responses                                                                                                        |
| Production admin smoke         | Development login hidden, development login request rejected403, no session cookie issued                                                                                        |

The browser workflow registers a labelled synthetic business/listing through Partner, uploads a decodable PNG, submits the draft, verifies the business and approves the venue through Admin, loads protected pending media, changes Customer cities without leaking prior-city results, saves a wishlist entry, submits an enquiry, sends an owner quote and reads the updated customer tracker. It suspends its own fixture afterward. Other cases cover anonymous/cross-site admin access/logout, denied GPS with manual selection, delayed real responses, offline/reconnection and invalid filter ranges.

The API suite also covers stale-role/MFA attestation rejection, ownership, moderation withdrawal, suspended edits, space/date filtering, enquiry idempotency/notifications, quote acceptance, explicit booking, concurrent cancellation/confirmation and database/REST overlap protection.

## Reproduction

Initialize cloud caches from README, then run from the repository root:

```sh
pnpm setup:local
pnpm db:test:prepare
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:integration
pnpm --filter @venuevista/api build
pnpm --filter @venuevista/admin-web build
pnpm exec dotenv -e .env -- pnpm --filter @venuevista/customer-mobile build --max-workers 2
pnpm exec dotenv -e .env -- pnpm --filter @venuevista/partner-mobile build --max-workers 2
```

For browsers run API4000/Admin development3000 and serve exported mobile apps with `scripts/serve-export.mjs` on8081/8082. Run `pnpm test:e2e`; the isolated container requires `PLAYWRIGHT_CONTAINER=true`. Redirect detached service logs to files so a later chat turn cannot close output pipes.

Android JS export uses Expo `--platform android` with a separate output directory. Native binaries need the Android toolchain, Firebase app configuration and signing/EAS. Storage wire commands/private configuration are documented in `apps/api/STORAGE.md`; no secret values are recorded here.

## Diagnosed limits

- Native Prisma engine downloads were denied by networking. The official pinned CLI JavaScript configuration validated/generated the client and initial SQL; experimental deployment hit an adapter catalog-type bug. The tested transactional SQL runner handles deployment instead. No signature, checksum or TLS verification was bypassed. Do not mix migration ledgers.
- Official MinIO image/binary access was unavailable. S3 requests were tested against a labelled local emulator. Actual MinIO/AWS IAM, privacy/encryption and deployed remote storage remain unverified; the real-provider privacy assertion remains intact.
- Live Firebase SMS/provider MFA, Google Maps, FCM and Sentry are unconfigured/unrun. Identity erasure/retention jobs are unfinished. See the product checklist for remaining features.
- Signed APK/AABs, native linking/install, physical/emulator device acceptance, Play submission and production security/compliance qualification were not performed. Browser network checks do not replace Android tests.
- API Docker image construction passed after configuring the existing proxy and supplied trusted CA through standard build arguments/BuildKit secrets. TLS and Corepack signature checks stayed enabled. The image ran in isolated development mode: real PostGIS health200, venue search200, anonymous admin401. Production container identity/storage/TLS deployment remains unverified.

## Container and setup repeatability

`pnpm build:api-image` captures the tested proxy/CA build configuration without copying the CA into image layers. The built image passed real database/search requests and access denial, then the dedicated smoke container was removed. The exact saved environment install script was read back from the configuration draft and executed successfully with the existing private configuration preserved.

## Saved environment configuration

`install_script` and `start_skill` were saved successfully with writable-cache initialization, repeatable DB setup, service startup and meaningful readiness checks. A native-tooling network addition for `binaries.prisma.sh` was also saved; the core uses the JavaScript client. Saving does not publish or verify fresh-task restoration. Review/save and publish through environment settings when desired.

Screenshots are in `/workspace/artifacts/VenueVista`; the source archive is `/workspace/artifacts/VenueVista-source.zip`. Archives exclude private configuration, dependencies and test traces. Source remains locally reviewable in the existing checkout.
