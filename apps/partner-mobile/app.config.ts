import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Firebase native configuration is opt-in; no privileged credentials are bundled. */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidConfig = process.env.GOOGLE_SERVICES_JSON;
  const iosConfig = process.env.GOOGLE_SERVICES_PLIST;
  const nativeConfigured = Boolean(androidConfig || iosConfig);
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins || [])];
  if (nativeConfigured) plugins.push('@react-native-firebase/app', '@react-native-firebase/auth');
  if (iosConfig) plugins.push(['expo-build-properties', { ios: { useFrameworks: 'static' } }]);
  return {
    ...config,
    name: 'VenueVista Partner',
    slug: 'venuevista-partner',
    android: { ...config.android, ...(androidConfig ? { googleServicesFile: androidConfig } : {}) },
    ios: { ...config.ios, ...(iosConfig ? { googleServicesFile: iosConfig } : {}) },
    plugins,
    extra: {
      ...config.extra,
      firebaseNativeAndroidConfigured: Boolean(androidConfig),
      firebaseNativeIosConfigured: Boolean(iosConfig),
    },
  };
};
