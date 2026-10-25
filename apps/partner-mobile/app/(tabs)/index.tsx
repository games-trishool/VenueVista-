import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/api';
import { useSession } from '../../src/session';
import type { Dashboard, Enquiry } from '../../src/types';
import {
  Badge,
  Button,
  Card,
  colors,
  Empty,
  ErrorState,
  Loading,
  Screen,
  styles,
} from '../../src/ui';
export default function DashboardScreen() {
  const user = useSession((s) => s.user);
  const query = useQuery({
    queryKey: ['partner-dashboard'],
    queryFn: () => api<Dashboard>('/partner/dashboard'),
  });
  const enquiries = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => api<Enquiry[]>('/enquiries'),
  });
  const stats = query.data
    ? [
        { label: 'Active listings', value: query.data.activeListings, icon: 'business-outline' },
        { label: 'New enquiries', value: query.data.newEnquiries, icon: 'chatbubble-outline' },
        { label: 'Pending review', value: query.data.pendingApprovals, icon: 'time-outline' },
        {
          label: 'Confirmed bookings',
          value: query.data.confirmedBookings,
          icon: 'calendar-outline',
        },
        { label: 'Scheduled visits', value: query.data.scheduledSiteVisits, icon: 'walk-outline' },
        { label: 'Pending quotes', value: query.data.pendingQuotes, icon: 'document-text-outline' },
      ]
    : [];
  return (
    <Screen>
      <View style={styles.spread}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.eyebrow}>VENUEVISTA PARTNER</Text>
          <Text style={styles.title}>Your workspace</Text>
          <Text style={styles.muted}>
            {user?.displayName ? `Welcome, ${user.displayName}.` : 'Welcome back.'} Let’s make room
            for celebrations.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications"
          style={{ padding: 8 }}
        >
          <Ionicons name="notifications-outline" size={23} color={colors.muted} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/account')}
          accessibilityLabel="Business profile"
          style={{ backgroundColor: colors.elevated, padding: 13, borderRadius: 18 }}
        >
          <Ionicons name="person-outline" size={22} color={colors.gold} />
        </Pressable>
      </View>
      <LinearGradient
        colors={['#3B285A', '#241B35']}
        style={{ borderRadius: 24, borderWidth: 1, borderColor: '#553B78', padding: 24, gap: 16 }}
      >
        <Text style={styles.eyebrow}>YOUR NEXT CHAPTER</Text>
        <Text style={[styles.heading, { fontSize: 25, lineHeight: 31, maxWidth: 340 }]}>
          A beautiful space deserves to be discovered.
        </Text>
        <Text style={[styles.muted, { maxWidth: 440 }]}>
          Create a complete listing, add your best photographs, and send it for review.
        </Text>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button title="Add a venue" icon="add" onPress={() => router.push('/venue/edit')} />
        </View>
      </LinearGradient>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
        >
          {stats.map((stat) => (
            <Card key={stat.label} style={{ flexGrow: 1, flexBasis: '44%', gap: 13 }}>
              <Ionicons name={stat.icon as any} size={22} color={colors.purple} />
              <Text style={[styles.title, { fontSize: 32 }]}>{stat.value}</Text>
              <Text style={styles.muted}>{stat.label}</Text>
            </Card>
          ))}
        </Animated.View>
      )}
      <View style={styles.spread}>
        <Text style={styles.heading}>Latest enquiries</Text>
        <Pressable onPress={() => router.push('/enquiries')}>
          <Text style={{ color: colors.purple, fontWeight: '600' }}>View all →</Text>
        </Pressable>
      </View>
      {enquiries.isLoading ? (
        <Loading />
      ) : enquiries.error ? (
        <ErrorState error={enquiries.error} retry={() => void enquiries.refetch()} />
      ) : !enquiries.data?.length ? (
        <Empty
          icon="chatbubbles-outline"
          title="Your conversations start here"
          text="When a customer enquires about an approved venue, you’ll see the request here. No enquiry is a booking until explicitly confirmed."
        />
      ) : (
        enquiries.data.slice(0, 3).map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/enquiry', params: { id: e.id } })}
          >
            <Card>
              <View style={styles.spread}>
                <Text style={[styles.heading, { flex: 1 }]}>
                  {e.venue?.name || 'Venue enquiry'}
                </Text>
                <Ionicons name="arrow-forward" color={colors.purple} size={20} />
              </View>
              <Text style={styles.muted}>
                {e.eventType} ·{' '}
                {new Date(e.eventDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} ·{' '}
                {e.guestCount} guests
              </Text>
              <Badge status={e.status} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
