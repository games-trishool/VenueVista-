import { useState } from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, humanize, money } from '../../src/api';
import type { Enquiry } from '../../src/types';
import {
  Badge,
  Card,
  Chip,
  colors,
  Empty,
  ErrorState,
  Loading,
  Screen,
  styles,
} from '../../src/ui';
export default function EnquiriesScreen() {
  const [filter, setFilter] = useState('ALL');
  const query = useQuery({ queryKey: ['enquiries'], queryFn: () => api<Enquiry[]>('/enquiries') });
  const records = query.data?.filter((e) => filter === 'ALL' || e.status === filter);
  return (
    <Screen>
      <View style={{ gap: 7 }}>
        <Text style={styles.eyebrow}>MEANINGFUL CONNECTIONS</Text>
        <Text style={styles.title}>Enquiries</Text>
        <Text style={styles.muted}>
          Respond thoughtfully, share clear quotes, and help customers plan their next celebration.
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {['ALL', 'NEW', 'QUOTE_SENT', 'SITE_VISIT_SCHEDULED', 'CONFIRMED', 'CLOSED'].map(
          (status) => (
            <Chip
              key={status}
              label={status === 'ALL' ? 'All enquiries' : humanize(status)}
              selected={filter === status}
              onPress={() => setFilter(status)}
            />
          ),
        )}
      </ScrollView>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !records?.length ? (
        <Empty
          icon="chatbubbles-outline"
          title={
            filter === 'ALL'
              ? 'The next celebration starts with a conversation'
              : 'Nothing here yet'
          }
          text={
            filter === 'ALL'
              ? 'Customer requests for your approved venues will appear here. New enquiries are not confirmed bookings.'
              : 'No enquiries match this status. Choose another filter to see your conversations.'
          }
        />
      ) : (
        records.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/enquiry', params: { id: e.id } })}
          >
            <Card>
              <View style={styles.spread}>
                <Badge status={e.status} />
                <Ionicons name="arrow-forward" size={20} color={colors.purple} />
              </View>
              <Text style={styles.heading}>{e.venue?.name || 'Venue enquiry'}</Text>
              <Text style={styles.text}>
                {e.user?.displayName || 'Customer'} · {e.eventType}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" color={colors.muted} size={15} />
                  <Text style={styles.muted}>
                    {new Date(e.eventDate).toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="people-outline" color={colors.muted} size={15} />
                  <Text style={styles.muted}>{e.guestCount} guests</Text>
                </View>
              </View>
              {e.budgetPaise ? (
                <Text style={{ color: colors.gold, fontSize: 14 }}>
                  Approximate budget {money(e.budgetPaise)}
                </Text>
              ) : null}
              {e.requirements ? (
                <Text numberOfLines={2} style={styles.muted}>
                  {e.requirements}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
