import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export function ConnectivityBanner() {
  const online = useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 100,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#78613C',
        backgroundColor: '#352C1E',
        padding: 13,
        alignSelf: 'center',
        maxWidth: 600,
      }}
    >
      <Text style={{ color: colors.gold, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        You’re offline. Reconnect to load venues and send enquiries.
      </Text>
    </View>
  );
}
