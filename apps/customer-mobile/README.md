# VenueVista Customer

A separate Android-first Expo application, with iOS-compatible navigation and a web target for development. Package ID: `com.venuevista.customer`.

From the repository root, start the API and run `pnpm dev:customer`. The API base URL is `EXPO_PUBLIC_API_URL`; use `http://10.0.2.2:4000/api/v1` for an Android emulator or your computer’s LAN address for a physical phone. Production requires an HTTPS URL. Public environment variables are bundled into the application and must never contain secrets.

## Implemented screens

Exactly three primary tabs: Home, Wishlist and Search. Profile is accessed through the home avatar. Supported city selection comes from the backend and is persisted, with recent cities; optional foreground GPS chooses the nearest supported city within 100 km. City changes use separate query cache keys and never carry results from the previous city into the new one. No location permission is requested on startup.

Discovery and pagination use the real REST API. Category, price, seating and amenity filters, sorting and locality/PIN/name/occasion search run on the backend. Venue details include real media galleries, capacity, amenities, spaces, indicative INR pricing, owner-provided availability, external Google Maps directions and sharing. Customer enquiries, messages, quote acceptance and owner-proposed site visits use authenticated database records. Quote acceptance never implies a confirmed booking. The comparison screen compares up to three API-backed venues.

No venue listings, prices, availability or reviews are fabricated in the app. Empty and API failure states are explicit. Browser offline transitions display a visible reconnect banner and paused queries resume when connectivity returns; native transport failures display retry states. The decorative celebration arch and app mark are original assets; they do not represent a real venue.

## Authentication boundary

Native sessions are kept in Expo SecureStore; the web development target uses sessionStorage. An expired session signs out. `EXPO_PUBLIC_ENABLE_DEV_AUTH=true` exposes an explicitly labelled seeded customer session for local testing only, and the backend independently requires development authentication to be enabled. The setting defaults to false. Never enable development sessions in release builds.

The phone sign-in screen sends a real verification SMS, confirms the six-digit code, and exchanges the Firebase ID token with `/auth/firebase`. It validates Indian numbers, handles invalid or expired codes, allows cancellation and bounded resend, and stores only the backend session. Firebase provider state is cleared after the proof exchange. No OTPs are invented or accepted locally.

Native uses `@react-native-firebase/app` and `@react-native-firebase/auth` in an Expo development or release build. Expo Go continues to support public browsing and explicitly enabled development sessions, but cannot provide native phone authentication. Supply server-side build variables `GOOGLE_SERVICES_JSON` (Android Firebase app configuration file path) and/or `GOOGLE_SERVICES_PLIST` (iOS configuration path). Config plugins are included only for supplied platform files; the app checks the current platform before offering sign-in. Firebase app configuration is public metadata, but privileged service-account credentials must never be bundled. Register package ID `com.venuevista.customer`, Android SHA-1/SHA-256 certificate fingerprints, phone provider and app verification in your Firebase project. iOS requires its bundle registration, APNs/app verification setup and a configured development build.

The web adapter uses Firebase's real `RecaptchaVerifier` and phone-auth SDK with in-memory Firebase persistence. Set `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID`, then authorize the application's HTTPS domain in Firebase. The backend separately needs `FIREBASE_PROJECT_ID` and Firebase Admin application-default credentials. Enable neither client nor server configuration against unrelated projects.

**Live SMS verification is unverified:** this environment has no configured Firebase project, authorized phone-test account, app-verification registration or signed device build. Missing configuration fails closed with a clear browsing option. Perform live and Firebase test-number OTP checks, expiry/resend limits, Android app verification and iOS APNs tests before release.

## Verification

Run `pnpm --filter @venuevista/customer-mobile typecheck` and `pnpm --filter @venuevista/customer-mobile build`. Web export validates the application bundle; it does not validate Android native behavior. Device checks still required: Android back navigation, denied location permission, rotation, keyboard interactions, SecureStore/session expiry, slow/offline network, accessibility and gallery memory use.

## Release

Original adaptive icon, splash and bundle identifiers are configured. `eas build --platform android --profile preview` creates an internal APK; `eas build --platform android --profile production` creates an Android App Bundle after EAS project association, signing setup and external service configuration. Keep signing keys in EAS or a managed secrets store. Update version/versionCode, API URL, privacy policy, account deletion disclosures and Play Data safety answers before internal testing. No AAB, store submission, production compliance or native device tests are claimed.

## Remaining scope

Live phone OTP and native app-verification tests; full in-app Google Maps result view and locality autocomplete; event-date/dining/standing/package-price filters; production crash monitoring and push setup; rich price breakdowns; end-to-end device automation. Account deactivation calls the backend; Firebase Auth identity deletion and legally reviewed retention/privacy terms remain release requirements. Account deactivation must not be described as immediate erasure of all transaction records.
