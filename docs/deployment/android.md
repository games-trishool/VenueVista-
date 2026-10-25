# Android builds and Google Play preparation

Customer and Partner are separate Expo applications. Customer uses
`com.venuevista.customer`; Partner uses `com.venuevista.partner`. Preserve these
identities after release. iOS bundle identifiers are separate release targets;
an Android build does not establish iOS compatibility.

## Development device

Install Node.js 24 and the pinned pnpm version. Run the API and then
`pnpm dev:customer` or `pnpm dev:partner`. Use the Android emulator or a development
build. Android emulators normally reach the host API at `10.0.2.2`; physical
devices require an accessible LAN address or a configured HTTPS endpoint. Keep
firewall exposure limited to the test network. Do not publish local development
persona authentication to the Internet.

Use Expo's permission request only when the related feature is used. Customers
must be able to choose a city when location permission is denied. Partner photo
selection must not request microphone/audio access. Review the generated Android
manifest, including transitive library permissions, before release.

## EAS build

1. Create separate Expo/EAS projects and confirm organizational ownership.
2. Install an approved EAS CLI version (16 or newer), record its exact version,
   and authenticate using your own secure Expo account. Do not share tokens in chat
   or commit them. Run EAS project configuration separately in each application.
3. Set the production HTTPS `EXPO_PUBLIC_API_URL` and public Firebase project
   configuration in the project's build environment. Explicitly disable
   `EXPO_PUBLIC_ENABLE_DEV_AUTH`. Expo public variables are readable in the bundle.
4. Review `app.json`/app configuration and `eas.json` in each app. Complete original
   adaptive icons, splash assets, app version, update policy, Google services
   configuration and crash monitoring. Native assets should be checked on devices;
   a background color alone is not a finished adaptive icon.
5. From each app directory, generate an internal APK and a production AAB:

   ```sh
   eas build --platform android --profile preview
   eas build --platform android --profile production
   ```

   EAS credentials/signing must be configured securely. Enable Play App Signing
   and protect the upload key. Save encrypted recovery material with the
   organization; never store a keystore or password in Git. The presence of an
   EAS profile is not evidence that a signed APK/AAB was generated.

## Internal testing checklist

- Verify installs, cold start, splash/icon rendering and upgrades on low/mid-range
  Android devices and the currently required target SDK.
- Test Firebase phone OTP on physical devices, expired sessions, sign-out and
  administrator role rejection from both mobile clients.
- Verify manual city selection, denied GPS permission, slow/offline responses,
  failed uploads, Android back navigation, rotation and accessibility font sizes.
- Exercise owner → admin → customer enquiry/quote workflow against staging.
- Verify only approved venues appear, paise/rupee formatting is correct, quotes
  do not confirm bookings, and contact information remains authorized.
- Review crash monitoring and notification delivery on a real device. Web export
  or TypeScript checks do not validate FCM or Android notification permissions.

## Google Play release requirements

Complete store descriptions, screenshots, content rating, support contact,
privacy policy URL, Data Safety answers, account deletion URL/in-app flow, and
permissions disclosures from the application's actual behavior and SDK data
collection. Review applicable Indian privacy requirements with qualified counsel.
Do not claim legal compliance from these instructions. Validate Firebase/Sentry
data handling and cross-border processors before completing disclosures.

An authorized release owner must review the staging results, sign the release,
upload to an internal testing track, and approve a staged rollout. No store upload,
native signed build, signing identity, policy acceptance, or public release is
performed merely by generating repository source.
