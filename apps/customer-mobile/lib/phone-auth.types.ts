export type PhoneAuthStatus = { ready: boolean; reason?: string };
export type PhoneChallenge = { confirm: (code: string) => Promise<string>; cancel: () => void };
