import { create } from 'zustand';
import { storage } from './storage';
import type { Location, User } from './types';
const defaultCity: Location = { name: 'Visakhapatnam', state: 'Andhra Pradesh' };
type State = {
  token: string | null;
  user: User | null;
  city: Location;
  recentCities: Location[];
  hydrated: boolean;
  toast: string | null;
  comparison: string[];
  hydrate: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  setCity: (city: Location) => Promise<void>;
  notify: (message: string | null) => void;
  toggleComparison: (id: string) => void;
};
export const useAppStore = create<State>((set, get) => ({
  token: null,
  user: null,
  city: defaultCity,
  recentCities: [],
  hydrated: false,
  toast: null,
  comparison: [],
  async hydrate() {
    try {
      const [session, city, recent] = await Promise.all([
        storage.get('vv-session'),
        storage.get('vv-city'),
        storage.get('vv-recent'),
      ]);
      set({
        ...(session ? JSON.parse(session) : {}),
        ...(city ? { city: JSON.parse(city) } : {}),
        ...(recent ? { recentCities: JSON.parse(recent) } : {}),
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  async setSession(token, user) {
    await storage.set('vv-session', JSON.stringify({ token, user }));
    set({ token, user });
  },
  async signOut() {
    await storage.remove('vv-session');
    set({ token: null, user: null });
  },
  async setCity(city) {
    const recentCities = [city, ...get().recentCities.filter((c) => c.name !== city.name)].slice(
      0,
      5,
    );
    await Promise.all([
      storage.set('vv-city', JSON.stringify(city)),
      storage.set('vv-recent', JSON.stringify(recentCities)),
    ]);
    set({ city, recentCities });
  },
  notify(toast) {
    set({ toast });
  },
  toggleComparison(id) {
    const previous = get().comparison;
    if (!previous.includes(id) && previous.length === 3) {
      set({ toast: 'You can compare up to three venues at a time.' });
      return;
    }
    set({
      comparison: previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    });
  },
}));
