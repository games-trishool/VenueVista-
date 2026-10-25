import { Tabs, Redirect, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../src/session';
import { colors, Loading } from '../../src/ui';
export default function TabsLayout() {
  const pathname = usePathname();
  const { token, user, hydrated } = useSession();
  if (!hydrated) return <Loading />;
  if (!token) return <Redirect href="/sign-in" />;
  if (user?.role === 'CUSTOMER' && !pathname.endsWith('/account'))
    return <Redirect href="/account" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 76,
          paddingTop: 9,
          paddingBottom: 13,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="venues"
        options={{
          title: 'Venues',
          tabBarIcon: ({ color }) => <Ionicons name="business-outline" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="enquiries"
        options={{
          title: 'Enquiries',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Business',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}
