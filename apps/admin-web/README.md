# VenueVista platform console

This is a separate Next.js web application for authorised administrators. It calls the central Nest API through a restricted server proxy. Session access tokens are kept in an HTTP-only, SameSite cookie; no administrator token is saved in local storage. Every administrative API operation is also checked by the API's role guard.

## Development

From the repository root after dependencies and the database are prepared:

```sh
API_URL=http://localhost:4000/api/v1 ADMIN_ENABLE_DEV_AUTH=true pnpm --filter @venuevista/admin-web dev
```

Enable `ENABLE_DEV_AUTH=true` on the API independently. Both switches are required for the explicitly labelled seeded administrator login. The dashboard switch never enables development login in a production build. For production, build with `pnpm --filter @venuevista/admin-web build`, then run `pnpm --filter @venuevista/admin-web start` with the production configuration below and both development switches disabled.

## Production identity

Configure the following public Firebase application identifiers for the web app: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`. These identify the Firebase client project; they are not service-account secrets. Configure server-side Firebase credentials on the API separately.

Administrators must already exist with the ADMIN database role and must enrol an authenticator-app TOTP factor with the identity administrator. The sign-in screen implements Firebase email/password sign-in and the TOTP second-factor challenge. The backend verifies the Firebase token, requires a second-factor claim for administrators, and checks the database role. This application does not allow public admin registration or first-time MFA enrolment. Firebase TOTP requires an appropriate Firebase Authentication with Identity Platform configuration. Authorise your actual dashboard domain in Firebase. Deploy using HTTPS so the production session cookie can be set securely.

Set the server-only `ADMIN_ORIGIN` to the dashboard's exact external HTTPS origin, for example `https://admin.example.com`, when deploying. Production mutation routes fail closed without it. The origin check uses this configured value and never trusts client-supplied forwarding headers. Local development can use the requested `Host` authority, allowing a server bound to `0.0.0.0` to accept the browser's matching `localhost` origin.

## Implemented operations

- Real API overview counters and pending-review queue.
- Paginated venue collection with backend name/city search and status filters.
- Full venue review, photograph pagination, address/map inspection, capacities, amenities, and independent spaces.
- Explicit approve/reject confirmation; rejection reasons required. Featured listing and suspension controls for approved venues.
- Partner-business review, paginated account directory, and read-only audit trail.
- Loading, empty, API failure, and expired-session states. Mutation origin checks, restricted proxy destinations, frame denial, and no-index metadata.

The web console intentionally provides no controls for account suspension, editing platform settings, report processing, or creating administrator identities. Those require additional workflows and are not claimed as implemented.

## Verification

```sh
pnpm --filter @venuevista/admin-web typecheck
pnpm --filter @venuevista/admin-web build
```

Production Firebase credentials, MFA enrolment and real identity-provider delivery must be verified in staging. A successful development login does not validate production identity configuration.
