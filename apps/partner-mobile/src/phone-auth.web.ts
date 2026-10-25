import { getApps, initializeApp } from 'firebase/app';
import {
  inMemoryPersistence,
  getAuth,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import {
  phoneAuthError,
  validateCode,
  validatePhone,
  type PhoneAuthStatus,
  type PhoneConfirmation,
} from './phone-auth.types';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const appName = 'venuevista-partner';
export function phoneAuthStatus(): PhoneAuthStatus {
  return Object.values(config).every(Boolean)
    ? { ready: true }
    : {
        ready: false,
        reason:
          'Phone sign-in is not available on this site yet. Please contact the VenueVista team.',
      };
}
function configuredAuth() {
  const status = phoneAuthStatus();
  if (!status.ready) throw new Error(status.reason);
  const app = getApps().find((a) => a.name === appName) || initializeApp(config, appName);
  return getAuth(app);
}
let verifier: RecaptchaVerifier | undefined;
let container: HTMLDivElement | undefined;
function clearCaptcha() {
  verifier?.clear();
  verifier = undefined;
  container?.remove();
  container = undefined;
}
export async function sendPhoneOtp(phone: string): Promise<PhoneConfirmation> {
  validatePhone(phone);
  const auth = configuredAuth();
  if (typeof document === 'undefined')
    throw new Error('Please open phone sign-in in your browser.');
  try {
    clearCaptcha();
    await setPersistence(auth, inMemoryPersistence);
    container = document.createElement('div');
    container.id = 'venuevista-partner-phone-security';
    document.body.appendChild(container);
    verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    clearCaptcha();
    let cancelled = false;
    return {
      cancel: () => {
        cancelled = true;
        clearCaptcha();
      },
      confirm: async (code) => {
        if (cancelled)
          throw new Error('This verification request was cancelled. Request a new code.');
        validateCode(code);
        try {
          const result = await confirmation.confirm(code);
          return await result.user.getIdToken(true);
        } catch (error) {
          throw phoneAuthError(error);
        }
      },
    };
  } catch (error) {
    clearCaptcha();
    throw phoneAuthError(error);
  }
}
export async function signOutPhoneProvider(): Promise<void> {
  if (phoneAuthStatus().ready && typeof window !== 'undefined') {
    clearCaptcha();
    await signOut(configuredAuth());
  }
}
