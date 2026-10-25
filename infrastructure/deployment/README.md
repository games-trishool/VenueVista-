# Deployment runbook

The repository targets a modular API deployment, a Next.js web deployment, and two
independently versioned Expo applications. This runbook prepares a staging release;
it does not certify a production deployment or publish an application.

## Staging prerequisites

- Managed PostgreSQL 16 with PostGIS and `btree_gist` available. Use distinct
  credentials and databases for development, tests, staging, and production.
- HTTPS API and admin domains, certificate renewal, restricted database ingress,
  and explicit API CORS origins.
- A Firebase project with phone authentication enabled for India, authorized
  Android/iOS/web applications, SMS quota/billing alerts, and administrator MFA.
- Server-side Firebase credentials through the hosting provider's secret manager
  or application-default identity. Never bake a service-account file into an image.
- The implemented private S3 adapter configured and verified against the actual staging bucket, private upload credentials, bounded
  upload policy, lifecycle rules, and approved public media delivery domains.
- Error monitoring, alert ownership, backup/restore access, and a privacy policy.

## API

1. Install with the committed pnpm lockfile and run `pnpm db:generate`.
2. Build with `pnpm --filter @venuevista/api build`. A container recipe is in
   `infrastructure/docker/api.Dockerfile`; build it from the repository root after
   all repository build checks pass. Container execution needs its own validation.
3. Inject `DATABASE_URL`, a unique high-entropy `AUTH_JWT_SECRET`, Firebase
   credentials, the exact allowed origins, and application URLs through a secret
   manager. Set `NODE_ENV=production` and `ENABLE_DEV_AUTH=false`.
4. Take a backup and run `pnpm db:migrate` as a single release job. The migration
   identity needs extension privileges; the runtime identity should not have
   schema-alteration privileges. Do not run `prisma db push` in production.
5. Start the API, verify `GET /api/v1/health`, then exercise an authenticated
   request and the approval/enquiry workflow against staging records.
6. Route traffic only after readiness succeeds. Retain the previous application
   version. Schema rollback may require a forward corrective migration; do not
   assume a down migration can preserve newly written records.

## Admin

Build `@venuevista/admin-web` with a server-only `API_URL` pointing to the API.
Run the Next.js server behind HTTPS. `ADMIN_ENABLE_DEV_AUTH` must be false. Set `ADMIN_ORIGIN` to the exact external HTTPS origin; mutations fail closed when it is absent or mismatched. Keep
session cookies HTTP-only, Secure on HTTPS, and SameSite. Provision administrators
through controlled database/identity administration; a phone registration must
never self-assign the ADMIN role. Validate MFA and account suspension in staging.

## Mobile

Follow [Android release instructions](../../docs/deployment/android.md). Public
Expo variables are bundled into the client and can be read by users. They may
contain URLs and public Firebase configuration, never server secrets. Disable
`EXPO_PUBLIC_ENABLE_DEV_AUTH` in release builds and point to the production HTTPS
API. Use independent EAS projects and update channels for Customer and Partner.

## Release gates

Read the [implementation checklist](../../docs/implementation-checklist.md) and
[security checklist](../../docs/deployment/security.md). An unchecked integration
or native-device check remains a release blocker even when TypeScript passes.

## API container build

Run `pnpm build:api-image` from the root with Docker/BuildKit available. The helper forwards existing standard proxy bindings and resolves their hosts for the isolated build namespace. If the trusted execution environment supplies `NODE_EXTRA_CA_CERTS`, its public CA is mounted as an optional BuildKit secret for Corepack/pnpm. TLS and package-signature verification remain enabled; no certificate/credential values are copied into the image. Normal direct-network builds need no custom CA.

The current image is a development deployment reference containing workspace build tooling. Reduce runtime contents and scan dependencies/images before a public production release. Runtime outbound proxy/CA and workload identity settings still need their own deployment configuration.
