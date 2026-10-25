# Implementation and continuation checklist

The [master brief](product-brief.md) describes the full requested product. This repository delivers a working development MVP of the primary business workflow. It is not a complete production marketplace or a signed Android release. See [validation evidence](validation.md).

## Implemented and validated locally

| Area                 | Status                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace            | pnpm11/Turborepo, Node24, TypeScript, ESLint, Prettier, environment templates and CI                                                                                                              |
| Database             | 24 Prisma models, PostgreSQL16/PostGIS, spatial indexes/triggers, monetary/reference constraints and confirmed-booking overlap exclusion                                                          |
| Migrations           | Transactional SQL runner, advisory lock, SHA256 history checks, repeatable migration/guarded seed and isolated test database; no production venues seeded                                         |
| Authorization        | JWT expiry/role/MFA attestation, server-established roles/ownership, suspended-user enforcement, validation and rate limits; negative/regression tests                                            |
| Partner              | Business registration, eight-step venue wizard, drafts, decoded image uploads, spaces, availability, moderation submission and enquiry/quote/site-visit operations                                |
| Admin                | HTTP-only sessions, origin protection, business verification, protected media review, approve/reject, feature/suspend, users and audit views                                                      |
| Customer             | Original dark UI, exactly three tabs, city/optional GPS selection, approved-only discovery, details/photos/pricing, search filters, wishlist, comparisons and contact/share actions               |
| Enquiries/bookings   | Persisted enquiries/messages/quotes/site visits/notifications, quote acceptance, explicit owner confirmation, serialized state changes and overlap rejection                                      |
| Phone authentication | Real Firebase native/web adapters and phone/code/resend UI, backend exchange and native SecureStore sessions; external provider/device verification outstanding                                   |
| Storage              | Local development and private S3 drivers with bounded reads, metadata stripping, server-only credentials and production TLS/configuration checks                                                  |
| Builds               | API and Next production builds, API Docker image with real DB/search smoke checks, both Expo web exports and both Android Hermes JavaScript bundles passed; native APK/AAB and device tests unrun |
| Browser acceptance   | Six real-API tests passed, including the complete owner/admin/customer/enquiry/quote workflow and resilience checks                                                                               |

The API run reports **45 passed,4 optional storage-wire cases skipped**. A separate wire run against a labelled local S3 emulator reports **3 passed,1 provider-privacy case deliberately skipped**. These are different configurations; do not claim every external service was exercised.

## External configuration and release checks

- Configure separate Firebase apps for both package IDs, backend Admin identity, India phone-auth delivery, Android fingerprints/app verification and iOS requirements. Test actual correct/invalid/expired/throttled OTPs and administrator MFA enrollment/login/revocation. No live SMS or provider MFA session was verified.
- Configure an actual private S3-compatible bucket/identity. Verify IAM, anonymous denial, TLS, encryption, lifecycle/deletion and restore. MinIO artifact access was unavailable; the emulator cannot qualify bucket privacy. The real-provider assertion is retained and unrun.
- Build signed APK/AABs and test native linking/install, permissions, Android back navigation, rotation, keyboard, accessibility, offline/slow networks, memory and performance on devices. JavaScript exports do not establish native app behavior.
- Configure HTTPS/CORS and exact `ADMIN_ORIGIN`, deploy staging, and review privacy/data-safety, retention, signing, backups and Play internal testing. Nothing was deployed or published.

## Remaining requested product implementation

- In-app map results/Google Places; every advanced capacity/facility/date/nearest/rating filter in the UI. Current city/GPS-to-city selection, textual locality/PIN search, external directions and backend PostGIS radius/date queries are implemented.
- Category/settings administration, notification templates and richer location-settings UI; an authorized location-settings API exists. Reports, customer support, owner/account suspension UI and comprehensive ratings/review moderation remain incomplete.
- Arbitrary pricing packages/itemized pricing, video walkthroughs, editing existing independent-space capacity/pricing, member delegation and venue-view trends. Adding spaces and declaring availability work.
- Autosave before required backend fields are complete, native date/time pickers and richer calendar/blocked-interval operations.
- FCM device registration/push/retry/preferences and Sentry/crash monitoring. Current notifications are persisted in-app records, not push delivery.
- Full identity erasure, scheduled retention/purge, audited session management and operational recovery exercises. Current account deletion deactivates the database identity and discloses retained enquiry/booking/audit records; Firebase erasure and legal retention approval remain outstanding.
- Large-feed cursor pagination, profiling and real personalization. Search/admin venues paginate; enquiries/notifications currently cap at100.

A model or integration boundary alone does not complete these features. Do not mark the entire master brief finished.

## Exact continuation

1. Read this file, validation evidence, root/app READMEs and applicable AGENTS instructions. Inspect Git status; preserve this implementation. Use the existing isolated checkout; do not create a worktree unless requested. The original remote was empty; the implementation is now on the GitHub `venuevista-mvp` delivery branch.
2. Initialize the cloud shell from README. Run `pnpm install --frozen-lockfile`, `pnpm setup:local` and `pnpm db:test:prepare` as needed. Preserve private configuration/data. Restart processes after snapshot restoration.
3. Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:integration` and relevant builds. Inspect actual skip counts. Start the browser-export services and run `pnpm test:e2e` for cross-app changes. Use disposable test databases only.
4. Complete each remaining feature across UI, validation, authorization, persistence and meaningful tests. Keep synthetic fixtures labelled and out of production inventory.
5. Supply credentials securely and follow deployment/storage/security/Android runbooks. Review/save and publish the environment draft through environment settings when desired; publication and fresh-task restoration were not verified here.
