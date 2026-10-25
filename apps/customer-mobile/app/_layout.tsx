import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../lib/store';
import { colors } from '../lib/theme';
import { ConnectivityBanner } from '../components/connectivity-banner';
export default function Layout() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } }),
  );
  const hydrate = useAppStore((s) => s.hydrate);
  const toast = useAppStore((s) => s.toast);
  const notify = useAppStore((s) => s.notify);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => notify(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, notify]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        />
        <ConnectivityBanner />
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 20, right: 20, bottom: 105, alignItems: 'center' }}
        >
          {toast && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => notify(null)}
              style={{
                backgroundColor: '#423356',
                borderWidth: 1,
                borderColor: '#7D619B',
                borderRadius: 16,
                padding: 16,
                maxWidth: 500,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 13, lineHeight: 20 }}>{toast}</Text>
            </Pressable>
          )}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
