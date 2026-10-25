export interface PhoneAuthStatus {
  ready: boolean;
  reason?: string;
}
export interface PhoneConfirmation {
  confirm: (code: string) => Promise<string>;
  cancel: () => void;
}

export function validatePhone(phone: string) {
  if (!/^\+91[6-9]\d{9}$/.test(phone))
    throw new Error('Enter a valid 10-digit Indian mobile number.');
}
export function validateCode(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your SMS.');
}
export function phoneAuthError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-phone-number': 'Please check your mobile number and try again.',
    'auth/invalid-verification-code': 'That code does not match. Check the SMS and try again.',
    'auth/code-expired': 'Your code expired. Request a new verification code.',
    'auth/session-expired': 'Your verification session expired. Request a new code.',
    'auth/too-many-requests': 'Too many attempts. Please wait a little before trying again.',
    'auth/quota-exceeded': 'SMS verification is temporarily unavailable. Please try again later.',
    'auth/network-request-failed': 'We couldn’t connect. Check your internet connection and retry.',
    'auth/captcha-check-failed': 'The security check could not be completed. Please retry.',
    'auth/missing-app-credential':
      'The app security check could not be completed. Please use an updated VenueVista build.',
    'auth/invalid-app-credential':
      'The app security check could not be completed. Please use an updated VenueVista build.',
    'auth/unauthorized-domain':
      'Phone sign-in is not enabled for this website. Contact the VenueVista team.',
    'auth/operation-not-allowed': 'Phone sign-in is not enabled yet. Contact the VenueVista team.',
    'auth/app-not-authorized':
      'This app is not authorized for phone sign-in. Please use an updated VenueVista build.',
    'auth/user-disabled': 'This account is disabled. Contact VenueVista support.',
  };
  return new Error(
    messages[code] ||
      'Phone verification could not be completed. Please retry or contact the VenueVista team.',
  );
}
