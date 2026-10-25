# VenueVista Partner

A separate Expo / React Native owner application, Android package `com.venuevista.partner`. It talks to the same versioned NestJS API as Customer and Admin.

## Run

From the monorepo root, install dependencies and start the database/API using the root README. Then run `pnpm dev:partner`. In `.env` set `EXPO_PUBLIC_API_URL` to the API reachable from the device:

- Expo web on this machine: `http://localhost:4000/api/v1`.
- Android Studio emulator: `http://10.0.2.2:4000/api/v1`.
- Physical phone on your LAN: your development computer's LAN address and port 4000. Do not use `localhost` on a phone to refer to your computer.

The API must allow the web app origin in its CORS configuration for browser development. Production must use HTTPS. Do not ship development access or private API credentials in client bundles.

`EXPO_PUBLIC_ENABLE_DEV_AUTH=true` shows an explicitly labelled development owner session action. The backend independently requires its development-auth flag and refuses this endpoint in production. The developer login uses a seeded account; all venues, uploads, enquiries, and quotes still use real backend records. There are no hardcoded live venues in this app.

## Implemented interfaces

- Real owner dashboard metrics and latest enquiries.
- Server-scoped organizations and business registration. A Firebase-authenticated customer can register a business; the server promotes the account to owner and the app refreshes its role.
- Venue portfolio with moderation status and review feedback.
- Eight-step listing editor: business/basics, location with validated India coordinates, venue capacities and first bookable space, amenities, INR starting rental, actual image uploads, policies, and review/submission.
- Backend draft save once required basic/location/capacity/pricing details are entered, and edits of existing drafts. Editing published listings withdraws them for review.
- Validated real multipart JPEG/PNG/WebP photo uploads and removal. Native images use authenticated requests; web uses authenticated blob fetches for unpublished media. Bearer tokens are sent only to the API origin.
- Multiple bookable spaces and owner availability declarations with existing monthly calendar entries and confirmed bookings.
- Enquiry filtering, detail, messages, quotations, proposed visits in India time, and permitted status changes.
- Explicit confirmed-booking action only after the customer accepted a quote; space selection, future dates, and explicit confirmation are required. The database remains authoritative for conflicts.
- In-app persisted notifications and mark-read actions.
- SecureStore sessions on native, tab-scoped sessionStorage on web, server role/ownership checks, expiry sign-out, and account deletion with retention disclosure.
- Loading, connection timeout, error/retry, empty data, and form validation states.

## Authentication integration boundary

The sign-in screen implements phone-number entry, real Firebase SMS requests, six-digit code verification, resend cooldown, and exchange of the verified identity token at `POST /auth/firebase`. It never displays or asks users to paste an authentication token. New verified customers can create a business and receive the server-rotated owner session. No SMS is fabricated, and missing configuration leaves the phone flow unavailable while explicit development personas remain usable locally.

For native authentication, supply `GOOGLE_SERVICES_JSON` and/or `GOOGLE_SERVICES_PLIST` as paths to this app's Firebase client configuration at build time. The dynamic Expo config adds the RNFirebase plugins only when these files are supplied. Build with an Expo development client or a release build; native phone verification cannot run inside Expo Go. Set Android signing SHA-1/SHA-256 fingerprints, enable Firebase phone authentication and India SMS delivery, configure Play Integrity/reCAPTCHA as required, and complete APNs/URL-scheme setup for iOS. These client configuration files are different from privileged server service-account credentials; never bundle the latter.

For browser verification, set `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID`, and authorize the deployment domain in Firebase. The browser adapter uses a genuine Firebase reCAPTCHA challenge and in-memory Firebase persistence; the VenueVista API session remains tab-scoped. The backend requires its separate Firebase Admin credentials/project configuration.

**Live SMS delivery, app verification, and device authentication are not verified in this cloud environment because no Firebase project, signing fingerprints, or native build credentials are configured.** Test correct, incorrect and expired codes, resend limits, denied/failed app verification and sign-out on actual devices before release.

FCM native device-token registration and push delivery, production S3 uploads, Google Maps place selection, and Sentry are external integrations that remain unconfigured. Existing notifications are in-app records, not push delivery. Do not describe this app as production complete before these integrations and release checks are done.

## Build and verify

- `pnpm --filter @venuevista/partner-mobile typecheck`
- `pnpm --filter @venuevista/partner-mobile build` exports the browser app for integration testing.
- `pnpm --filter @venuevista/partner-mobile android` needs Android SDK / emulator.
- `eas build --platform android --profile preview` produces an internal testing APK after Expo project association.
- `eas build --platform android --profile production` produces an AAB. Set a production HTTPS API URL and `EXPO_PUBLIC_ENABLE_DEV_AUTH=false` before building. Use EAS-managed signing or a protected keystore, never commit signing keys.

Original vector icon source and generated app/adaptive/splash PNGs are included in `assets/`. Browser and JavaScript exports do not prove an Android binary works. Test on a physical mid-range Android phone before internal Play testing.

## Remaining product work

Live Firebase SMS/app-verification validation on Android/iOS; native push/device registration; fully configured production storage/maps/monitoring; member delegation inside organizations; editing existing independently bookable space capacities/pricing (adding a space is implemented); arbitrary pricing packages and itemized pricing UI; venue view trend analytics; draft autosave before required backend fields are complete; keyboard/screen-reader/rotation/back-navigation/device testing; polished native date/time pickers; privacy policy/data-safety review and retention/legal approval; app signing and Play Console release checks. Server-side deletion currently retains enquiry/audit/booking records and requires configured identity deletion; the UI discloses this limitation.

## Manual acceptance workflow

1. Sign in to the development owner workspace against an initialized API.
2. Register a business on the Business tab.
3. Add a venue, enter genuine location/capacity/starting rental details, and save a draft.
4. Upload a valid photo, enter policies, and submit for review.
5. In Admin, verify the organization and approve the venue.
6. In Customer, choose the correct city, find the approved venue, and send an enquiry.
7. In Partner, open the enquiry, send an actual quote, and verify Customer sees it.
8. Have Customer accept the quote; Partner explicitly confirms a space/time. Attempt an overlapping booking and verify the API rejects it.

Only report these checks as passed when they are actually run. Root test reports record executed API and browser coverage.
