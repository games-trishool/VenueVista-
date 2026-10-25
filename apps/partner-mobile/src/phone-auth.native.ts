import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import {
  phoneAuthError,
  validateCode,
  validatePhone,
  type PhoneAuthStatus,
  type PhoneConfirmation,
} from './phone-auth.types';

export function phoneAuthStatus(): PhoneAuthStatus {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return {
      ready: false,
      reason:
        'Phone sign-in requires a VenueVista development or release build. Please use that build instead of Expo Go.',
    };
  const extra = Constants.expoConfig?.extra;
  const configured =
    Platform.OS === 'android'
      ? extra?.firebaseNativeAndroidConfigured
      : Platform.OS === 'ios'
        ? extra?.firebaseNativeIosConfigured
        : false;
  return configured
    ? { ready: true }
    : {
        ready: false,
        reason:
          'Phone sign-in is not enabled in this build yet. Ask your app administrator to finish authentication setup.',
      };
}

export async function sendPhoneOtp(phone: string): Promise<PhoneConfirmation> {
  validatePhone(phone);
  const status = phoneAuthStatus();
  if (!status.ready) throw new Error(status.reason);
  try {
    // Lazy imports let unconfigured Expo Go builds still use explicit development sessions.
    const { getApp } = await import('@react-native-firebase/app');
    const { getAuth, signInWithPhoneNumber } = await import('@react-native-firebase/auth');
    const auth = getAuth(getApp());
    const confirmation = await signInWithPhoneNumber(auth, phone);
    let cancelled = false;
    return {
      cancel: () => {
        cancelled = true;
      },
      confirm: async (code) => {
        if (cancelled)
          throw new Error('This verification request was cancelled. Request a new code.');
        validateCode(code);
        try {
          const credential =
            auth.currentUser?.phoneNumber === phone ? null : await confirmation.confirm(code);
          const user = credential?.user || auth.currentUser;
          if (!user || user.phoneNumber !== phone)
            throw new Error('Verification did not return the requested phone account.');
          return await user.getIdToken(true);
        } catch (error) {
          throw phoneAuthError(error);
        }
      },
    };
  } catch (error) {
    throw phoneAuthError(error);
  }
}
export async function signOutPhoneProvider(): Promise<void> {
  if (!phoneAuthStatus().ready) return;
  const { getApp } = await import('@react-native-firebase/app');
  const { getAuth, signOut } = await import('@react-native-firebase/auth');
  await signOut(getAuth(getApp()));
}
