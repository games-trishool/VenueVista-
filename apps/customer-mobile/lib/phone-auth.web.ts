import type { PhoneAuthStatus, PhoneChallenge } from './phone-auth.types';
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export function phoneAuthStatus(): PhoneAuthStatus {
  const ready = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
  return ready
    ? { ready }
    : {
        ready,
        reason:
          'Phone sign-in hasn’t been enabled for this build yet. You can continue exploring without an account.',
      };
}
export async function sendPhoneOtp(phone: string): Promise<PhoneChallenge> {
  if (!phoneAuthStatus().ready) throw new Error(phoneAuthStatus().reason);
  if (typeof document === 'undefined')
    throw new Error('Open VenueVista in a browser to verify your phone.');
  if (!/^\+91[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid Indian mobile number.');
  const [
    { getApps, initializeApp },
    {
      getAuth,
      RecaptchaVerifier,
      signInWithPhoneNumber,
      setPersistence,
      inMemoryPersistence,
      getIdToken,
    },
  ] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app =
    getApps().find((item) => item.name === 'venuevista-customer') ??
    initializeApp(firebaseConfig, 'venuevista-customer');
  const auth = getAuth(app);
  // Native sessions use the native SDK; web never persists a Firebase refresh token.
  await setPersistence(auth, inMemoryPersistence);
  const host = document.createElement('div');
  host.id = `venuevista-phone-recaptcha-${Date.now()}`;
  document.body.appendChild(host);
  const verifier = new RecaptchaVerifier(auth, host, { size: 'invisible' });
  let cancelled = false;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    verifier.clear();
    host.remove();
  };
  try {
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return {
      async confirm(code) {
        if (cancelled) throw new Error('This code request was cancelled. Request a new code.');
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit verification code.');
        try {
          const result = await confirmation.confirm(code);
          const token = await getIdToken(result.user, true);
          cleanup();
          return token;
        } catch (error) {
          throw readableError(error);
        }
      },
      cancel() {
        cancelled = true;
        cleanup();
      },
    };
  } catch (error) {
    cleanup();
    throw readableError(error);
  }
}
export async function signOutPhoneAuth(): Promise<void> {
  if (!phoneAuthStatus().ready) return;
  const [{ getApps }, { getAuth, signOut }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps().find((item) => item.name === 'venuevista-customer');
  if (app) await signOut(getAuth(app));
}
function readableError(error: unknown): Error {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/invalid-verification-code')
    return new Error('That code wasn’t correct. Please check it and try again.');
  if (code === 'auth/code-expired' || code === 'auth/session-expired')
    return new Error('That code has expired. Request a new one.');
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded')
    return new Error('Too many code requests. Please wait and try again later.');
  if (
    code === 'auth/unauthorized-domain' ||
    code === 'auth/invalid-app-credential' ||
    code === 'auth/captcha-check-failed'
  )
    return new Error(
      'Phone verification could not verify this app. Its Firebase authorized domain and app verification settings need to be checked.',
    );
  if (code === 'auth/network-request-failed')
    return new Error('We couldn’t connect to phone verification. Check your connection.');
  return error instanceof Error
    ? error
    : new Error('Phone verification is unavailable. Please try again.');
}
