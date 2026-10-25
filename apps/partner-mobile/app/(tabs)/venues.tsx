import { Text, View, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, humanize, money } from '../../src/api';
import { AuthImage } from '../../src/AuthImage';
import type { Venue } from '../../src/types';
import {
  Badge,
  Button,
  Card,
  colors,
  Empty,
  ErrorState,
  Loading,
  Notice,
  Screen,
  styles,
} from '../../src/ui';
export default function VenuesScreen() {
  const query = useQuery({
    queryKey: ['partner-venues'],
    queryFn: () => api<Venue[]>('/partner/venues'),
  });
  return (
    <Screen>
      <View style={styles.spread}>
        <View style={{ gap: 5 }}>
          <Text style={styles.eyebrow}>YOUR PORTFOLIO</Text>
          <Text style={styles.title}>Your venues</Text>
        </View>
        <Button title="Add venue" icon="add" onPress={() => router.push('/venue/edit')} />
      </View>
      <Text style={styles.muted}>
        Keep every space, detail, and photograph in one place. Only approved listings are visible to
        customers.
      </Text>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Empty
          icon="business-outline"
          title="Make an entrance"
          text="Add your first venue to start receiving enquiries. You can save a draft before sending it for approval."
          action={
            <Button title="Create your first listing" onPress={() => router.push('/venue/edit')} />
          }
        />
      ) : (
        query.data.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => router.push({ pathname: '/venue/edit', params: { id: v.id } })}
          >
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {v.media?.[0]?.url ? (
                <AuthImage
                  url={v.media[0].url}
                  label={v.name}
                  style={{ width: '100%', height: 180 }}
                />
              ) : (
                <View
                  style={{
                    backgroundColor: '#282030',
                    height: 125,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="images-outline" color={colors.muted} size={32} />
                  <Text style={[styles.muted, { marginTop: 8 }]}>Add your venue photography</Text>
                </View>
              )}
              <View style={{ padding: 20, gap: 12 }}>
                <View style={styles.spread}>
                  <Text style={[styles.heading, { flex: 1 }]}>{v.name}</Text>
                  <Badge status={v.status} />
                </View>
                <Text style={styles.muted}>
                  {v.locality}, {v.city} · {humanize(v.category)}
                </Text>
                <View style={styles.spread}>
                  <Text style={styles.muted}>
                    {v.seatingCapacity} seated · {v.diningCapacity} dining
                  </Text>
                  <Text style={{ color: colors.gold, fontWeight: '600' }}>
                    {money(v.rentalPricePaise)}{' '}
                    <Text style={{ fontWeight: '400', color: colors.muted, fontSize: 11 }}>
                      starting
                    </Text>
                  </Text>
                </View>
                {v.rejectionReason ? (
                  <Notice tone="error" message={`Review feedback: ${v.rejectionReason}`} />
                ) : null}
                <Text style={{ color: colors.purple, fontSize: 13, fontWeight: '600' }}>
                  Manage listing →
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
