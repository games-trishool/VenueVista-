import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { PhoneAuthStatus, PhoneChallenge } from './phone-auth.types';
export function phoneAuthStatus(): PhoneAuthStatus {
  if (Constants.executionEnvironment === 'storeClient')
    return {
      ready: false,
      reason:
        'Phone sign-in requires the VenueVista development or release app. It is not available in Expo Go. You can keep browsing here.',
    };
  const extra = Constants.expoConfig?.extra;
  const configured =
    Platform.OS === 'android'
      ? extra?.firebaseNativeAndroidConfigured
      : Platform.OS === 'ios'
        ? extra?.firebaseNativeIosConfigured
        : false;
  if (!configured)
    return {
      ready: false,
      reason:
        'Phone sign-in hasn’t been enabled for this build yet. You can continue exploring without an account.',
    };
  return { ready: true };
}
export async function sendPhoneOtp(phone: string): Promise<PhoneChallenge> {
  const status = phoneAuthStatus();
  if (!status.ready) throw new Error(status.reason);
  if (!/^\+91[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid Indian mobile number.');
  try {
    // Lazy imports keep public browsing and local sessions usable in Expo Go.
    const [{ getApp }, { getAuth, signInWithPhoneNumber, getIdToken }] = await Promise.all([
      import('@react-native-firebase/app'),
      import('@react-native-firebase/auth'),
    ]);
    const auth = getAuth(getApp());
    const confirmation = await signInWithPhoneNumber(auth, phone);
    let cancelled = false;
    return {
      async confirm(code) {
        if (cancelled) throw new Error('This code request was cancelled. Request a new code.');
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit verification code.');
        try {
          // Android may already have verified the SMS automatically.
          const result =
            auth.currentUser?.phoneNumber === phone ? null : await confirmation.confirm(code);
          const user = result?.user ?? auth.currentUser;
          if (!user || user.phoneNumber !== phone)
            throw new Error('The code could not be verified. Please request a new one.');
          return getIdToken(user, true);
        } catch (error) {
          throw readableError(error);
        }
      },
      cancel() {
        cancelled = true;
      },
    };
  } catch (error) {
    throw readableError(error);
  }
}
export async function signOutPhoneAuth(): Promise<void> {
  if (!phoneAuthStatus().ready) return;
  const [{ getApp }, { getAuth, signOut }] = await Promise.all([
    import('@react-native-firebase/app'),
    import('@react-native-firebase/auth'),
  ]);
  await signOut(getAuth(getApp()));
}
function readableError(error: unknown): Error {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/invalid-verification-code')
    return new Error('That code wasn’t correct. Please check it and try again.');
  if (code === 'auth/session-expired' || code === 'auth/code-expired')
    return new Error('That code has expired. Request a new one.');
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded')
    return new Error('Too many code requests. Please wait and try again later.');
  if (code === 'auth/invalid-phone-number') return new Error('Enter a valid Indian mobile number.');
  if (
    code === 'auth/app-not-authorized' ||
    code === 'auth/invalid-app-credential' ||
    code === 'auth/missing-client-identifier'
  )
    return new Error(
      'This app could not complete phone verification. Firebase app verification needs to be configured for this build.',
    );
  if (code === 'auth/network-request-failed')
    return new Error('We couldn’t connect to phone verification. Check your connection.');
  return error instanceof Error
    ? error
    : new Error('Unable to send a verification code. Please try again.');
}
