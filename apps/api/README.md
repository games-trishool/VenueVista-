# VenueVista API

NestJS modular-monolith service with real PostgreSQL/PostGIS persistence. Base path: `/api/v1`.

From the repository root, run `pnpm setup:local`, then `pnpm dev:api`. The root `.env` is loaded by the root scripts. Readiness is `GET /api/v1/health`; development OpenAPI UI and JSON are `/api/docs` and `/api/docs-json`. Swagger is disabled in production. Money is integer INR **paise**, event dates are `YYYY-MM-DD`, and timestamps use ISO 8601 offsets. Database times are UTC; event-day checks use `Asia/Kolkata`.

## Authentication

`POST auth/firebase {idToken}` verifies Firebase ID tokens and checks revocation. New customer/owner identities require phone sign-in. New users always start as customers; creating a business via `POST organizations` creates an owner application and changes the server-held role to OWNER. That response includes a rotated `session` when the role changes; clients must store it. Administrative identities must be provisioned by a trusted database operator, never by a public endpoint. Existing admins must provide a Firebase second-factor claim and verified email for password sign-in. Internal API access tokens expire after one hour. Every request reloads the active user's role and status from the database, rejects changed signed roles, and requires a signed MFA attestation for nondevelopment admins.

For local development **only**, set `ENABLE_DEV_AUTH=true` outside production and `POST auth/dev-session {persona:"owner"|"customer"|"admin"}`. These are fixed, clearly labelled development accounts. Extra role or identity fields are rejected. Development users cannot authenticate when that setting is disabled. Starting a production process with this flag enabled is rejected.

Production authentication additionally needs Firebase Admin application-default credentials (`GOOGLE_APPLICATION_CREDENTIALS` outside source control), `FIREBASE_PROJECT_ID`, and a strong `AUTH_JWT_SECRET`. Client Firebase configuration is public configuration; service-account credentials belong only on the server. No OTP or credentials are invented locally.

## First business workflow

1. Owner: `POST organizations {name,phone?,address?}`; `GET organizations` returns only owned profiles.
2. Owner: `POST partner/venues` creates a DRAFT. Required fields: `name,description,category,city,state,locality,pincode,address,latitude,longitude,seatingCapacity,diningCapacity,rentalPricePaise,amenities,eventTypes`. Add `organizationId`. The API assigns owner/status itself. `spaces` is optional; otherwise a default main space inherits the venue capacities and price. Category identifiers are returned by `GET categories`.
3. Owner: `POST partner/venues/:id/media`, multipart field `file`. Then `POST partner/venues/:id/submit`.
4. Administrator: `POST admin/organizations/:id/review {decision:"APPROVED"}` to verify the business, then `POST admin/venues/:id/review {decision:"APPROVED"}`. Rejection requires `reason`. Both write audit records. Admins can inspect pending details via `GET admin/venues/:id`.
5. Customer: `GET venues?city=Visakhapatnam` and `GET venues/:id` show approved venues belonging to active users/businesses. `PUT wishlist/:venueId` and `DELETE wishlist/:venueId` are idempotent; `GET wishlist` returns visible saved venues.
6. Customer: `POST enquiries {venueId,spaceId?,eventDate,eventType,guestCount,budgetPaise?,requirements?,idempotencyKey}`. Generate a UUID submission key once and reuse it for a retry. A reused key with different content returns 409. The enquiry and owner in-app notification are committed together.
7. Owner: `GET enquiries`; `POST enquiries/:id/quotes {amountPaise,description,validUntil?}` changes the enquiry to QUOTE_SENT and creates a customer notification. `GET enquiries/:id` shows persisted quotes, messages, visits and booking. All lists are actor-scoped.
8. Optional explicit booking: customer `POST enquiries/:id/quotes/:quoteId/accept`, then owner `POST enquiries/:id/confirm {spaceId,quoteId,startsAt,endsAt,confirmation:true}`. A quote/enquiry alone is never a booking. Confirmed overlap protection is a database exclusion constraint, including concurrent writes. Every enquiry mutation locks the enquiry row and rechecks its terminal state inside the transaction, so cancellation, quotation changes and confirmation cannot overwrite each other's completed state.

`PATCH partner/venues/:id` withdraws publication and returns the listing to DRAFT for another review. Media changes also withdraw publication. Independently bookable spaces can be added with `POST partner/venues/:id/spaces`; existing spaces are not silently replaced while references/bookings exist.

## Search and availability

`GET venues` accepts `city,q,category,minPrice,maxPrice,minCapacity,diningCapacity,amenities` (comma separated), `eventType,eventDate,latitude,longitude,radiusKm,sort,page,limit`. Sort values: `relevance,nearest,price_asc,price_desc,capacity,recent`. Nearest requires both coordinates. Search uses parameterized SQL, PostGIS `ST_DWithin`/`ST_Distance`, stable ordering and database pagination. `q` searches venue name, city, locality, PIN and category. `city` is an exact case-insensitive filter, preventing stale cross-city results.

`GET locations` returns configurable launch cities from the `locations` platform setting, falling back to the AP/TS launch-city configuration. Admins may replace it with `PUT admin/settings/locations` (array of `{id,name,state,latitude,longitude}`); updates are audited.

`GET venues/:id/availability?month=YYYY-MM` returns `{entries,bookings,defaultStatus:"NOT_CONFIRMED"}`; absent data does **not** imply available. Owner-private equivalent is `GET partner/venues/:id/availability`. `PUT partner/spaces/:id/availability {date,status,notes?}` supports AVAILABLE, UNAVAILABLE, TENTATIVE and NOT_CONFIRMED. Search excludes venue-wide unavailable dates; comprehensive multi-space calendar search remains on the implementation checklist.

## Other routes

- `GET partner/dashboard`: persisted listing, enquiry, booking, visit and view aggregates.
- `POST enquiries/:id/messages {body}`: authorized conversation and notification.
- `POST enquiries/:id/site-visits {scheduledAt,notes?}`: owner proposes a site visit; stored response fields are `startsAt,note,status`.
- `POST enquiries/:id/status {status}`: scoped status changes; customer may only cancel. Terminal enquiries cannot be reopened through this endpoint.
- `GET notifications`, `PUT notifications/:id/read`: in-app notification inbox. FCM delivery is not implemented.
- `GET admin/overview`, `GET admin/venues`, `GET admin/organizations`, `GET admin/users`, `GET admin/audit`: admin-only paginated operational APIs.
- `POST admin/venues/:id/suspend {reason}` and `/feature {featured}`: audited moderation.
- `GET me`, `DELETE me`: own account. Deletion tombstones the local account, removes profile/wishlist and suspends owned listings; future confirmed bookings must first be resolved. Booking, enquiry and audit records are retained. Firebase identity deletion and automated retention jobs still require implementation before release; this endpoint does not claim full data erasure.

## Media and deployment limits

Local development media are stored outside source at `MEDIA_STORAGE_PATH`, capped at 8 MiB and 30 photos per venue. JPEG/PNG/WebP signatures must match their MIME type, and Sharp must decode the image within a 30 MP bound before it is re-encoded without metadata. Server-generated keys prevent path traversal. Unpublished media require an authorized owner/admin bearer token; approved media can be read publicly. The admin server proxies private images with its session token.

Production uploads fail closed until a production S3-compatible storage adapter, bucket policy, malware pipeline and lifecycle rules are implemented. Local files and in-memory rate-limit counters are development infrastructure. Use durable object storage and shared rate limits before scaling replicas. HTTPS terminates at the deployment proxy; production CORS origins must use HTTPS. Phone/contact data are omitted from customer-to-owner enquiry identity objects. FCM, Sentry and maps APIs are not claimed configured.

## Verification

From the root:

```sh
pnpm --filter @venuevista/api typecheck
pnpm --filter @venuevista/api test
ENABLE_INTEGRATION_TESTS=true pnpm test
```

The integration suite requires `ENABLE_DEV_AUTH=true`, a migrated non-production database and root `.env` loading. When `TEST_DATABASE_URL` is set, it is used instead of the application database. Tests create labelled records, exercise real REST requests and database constraints, and clean up their records. Without the explicit integration flag, the 15 integration cases are reported as skipped. No zero-test success is treated as readiness.

The committed initial migration was generated from Prisma and extended with native geospatial/booking invariants. The forward-only runner records SHA-256 checksums and uses a transaction plus advisory lock. The ORM uses Prisma's GA pure-JS PostgreSQL adapter. Native Prisma binary downloads were blocked by the cloud network policy; the bundled official schema WASM engine generates clients, and `prisma/migrate.ts` applies the checked-in SQL. The native Prisma `_prisma_migrations` ledger is not used by that runner; do not mix migration runners without an explicit reconciliation step.
