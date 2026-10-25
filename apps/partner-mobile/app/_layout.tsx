import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '../src/session';
import { colors } from '../src/ui';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 }, mutations: { retry: false } },
});
export default function Layout() {
  useEffect(() => {
    void useSession.getState().hydrate();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="venue/edit" options={{ title: 'Venue workspace' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="availability" options={{ title: 'Availability calendar' }} />
          <Stack.Screen name="enquiry" options={{ title: 'Enquiry details' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
