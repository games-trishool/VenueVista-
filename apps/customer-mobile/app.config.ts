import type { ExpoConfig } from 'expo/config';

const androidServices = process.env.GOOGLE_SERVICES_JSON;
const iosServices = process.env.GOOGLE_SERVICES_PLIST;
const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  'expo-dev-client',
  'expo-secure-store',
  [
    'expo-location',
    {
      locationWhenInUsePermission:
        'VenueVista uses your location only when you ask to find nearby venues.',
    },
  ],
];
if (androidServices || iosServices)
  plugins.push('@react-native-firebase/app', '@react-native-firebase/auth');
if (iosServices) plugins.push(['expo-build-properties', { ios: { useFrameworks: 'static' } }]);

const config: ExpoConfig = {
  name: 'VenueVista',
  slug: 'venuevista-customer',
  scheme: 'venuevista',
  version: '0.1.0',
  orientation: 'default',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#111015' },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.venuevista.customer',
    ...(iosServices ? { googleServicesFile: iosServices } : {}),
  },
  android: {
    package: 'com.venuevista.customer',
    versionCode: 1,
    ...(androidServices ? { googleServicesFile: androidServices } : {}),
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#111015' },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    blockedPermissions: ['RECORD_AUDIO'],
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
  plugins,
  extra: {
    firebaseNativeAndroidConfigured: Boolean(androidServices),
    firebaseNativeIosConfigured: Boolean(iosServices),
  },
  experiments: { typedRoutes: false },
};
export default config;
