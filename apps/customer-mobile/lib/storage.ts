import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web')
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
