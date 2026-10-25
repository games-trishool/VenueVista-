import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
const tabs = {
  index: { label: 'Home', active: 'home', inactive: 'home-outline' },
  wishlist: { label: 'Wishlist', active: 'heart', inactive: 'heart-outline' },
  search: { label: 'Search', active: 'search', inactive: 'search-outline' },
} as const;
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const inset = Math.max(24, (width - 530) / 2);
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={({ state, navigation }) => (
        <View
          accessibilityRole="tablist"
          style={{
            position: 'absolute',
            flexDirection: 'row',
            backgroundColor: '#211B2B',
            borderWidth: 1,
            borderColor: '#41354F',
            borderRadius: 26,
            left: inset,
            right: inset,
            bottom: Math.max(22, safeArea.bottom),
            height: 72,
            paddingHorizontal: 8,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 20,
          }}
        >
          {state.routes.map((route, index) => {
            const tab = tabs[route.name as keyof typeof tabs];
            if (!tab) return null;
            const focused = state.index === index;
            const color = focused ? colors.accent : '#88818F';
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented)
                    navigation.navigate(route.name, route.params);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name={focused ? tab.active : tab.inactive} size={23} color={color} />
                <Text
                  style={{
                    color,
                    fontSize: 10,
                    lineHeight: 14,
                    fontWeight: '600',
                    includeFontPadding: false,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
    </Tabs>
  );
}
