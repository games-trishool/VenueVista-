// Metro selects the native or web adapter. This safe fallback supports tooling/SSR.
import type { PhoneAuthStatus, PhoneChallenge } from './phone-auth.types';
export function phoneAuthStatus(): PhoneAuthStatus {
  return {
    ready: false,
    reason:
      'Phone sign-in is unavailable on this platform. You can continue exploring without an account.',
  };
}
export async function sendPhoneOtp(_phone: string): Promise<PhoneChallenge> {
  throw new Error(phoneAuthStatus().reason);
}
export async function signOutPhoneAuth(): Promise<void> {}
