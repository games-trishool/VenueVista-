import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session, User } from './types';
import { signOutPhoneProvider } from './phone-auth';

const key = 'venuevista.partner.session.v1';
interface SessionState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  storageError: string | null;
  hydrate: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}
async function save(value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    }
  } else if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}
export const useSession = create<SessionState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  storageError: null,
  hydrate: async () => {
    try {
      const raw =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? sessionStorage.getItem(key)
            : null
          : await SecureStore.getItemAsync(key);
      if (raw) {
        const s = JSON.parse(raw) as Session;
        if (s.accessToken && s.user?.role && s.user.role !== 'ADMIN')
          set({ token: s.accessToken, user: s.user });
      }
    } catch {
      set({ storageError: 'Your saved session could not be restored. Please sign in again.' });
    } finally {
      set({ hydrated: true });
    }
  },
  signIn: async (session) => {
    if (session.user.role === 'ADMIN')
      throw new Error(
        'This app is for venue owners. Administrator accounts use the admin dashboard.',
      );
    await save(JSON.stringify(session));
    set({ token: session.accessToken, user: session.user, storageError: null });
  },
  signOut: async () => {
    await save(null);
    set({ token: null, user: null });
    // Platform sign-out remains effective even if an unconfigured provider is absent.
    await signOutPhoneProvider().catch(() => {});
  },
}));
