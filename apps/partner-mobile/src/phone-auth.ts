/** Metro selects .native.ts or .web.ts. This fallback keeps unsupported targets fail-closed. */
import type { PhoneAuthStatus, PhoneConfirmation } from './phone-auth.types';
export function phoneAuthStatus(): PhoneAuthStatus {
  return { ready: false, reason: 'Phone sign-in is not available on this platform.' };
}
export async function sendPhoneOtp(_phone: string): Promise<PhoneConfirmation> {
  throw new Error(phoneAuthStatus().reason);
}
export async function signOutPhoneProvider(): Promise<void> {}
