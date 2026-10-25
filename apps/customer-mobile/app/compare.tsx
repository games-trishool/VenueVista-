import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { request } from '../lib/api';
import { useAppStore } from '../lib/store';
import { categoryName, rupees, type Venue } from '../lib/types';
import { colors, ui } from '../lib/theme';
import { EmptyState, ErrorState, Icon, PageHeader } from '../components/ui';
import { VenueSkeleton } from '../components/skeleton';
export default function Compare() {
  const ids = useAppStore((s) => s.comparison);
  const remove = useAppStore((s) => s.toggleComparison);
  const venues = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['venue', id],
      queryFn: () => request<Venue>(`/venues/${id}`),
    })),
  });
  const pending = venues.some((v) => v.isPending);
  const failed = venues.find((v) => v.isError);
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content}>
        <PageHeader
          title="A place that feels just right"
          subtitle="Compare up to three venues, side by side."
        />
        {!ids.length ? (
          <EmptyState
            icon="git-compare-outline"
            title="A few beautiful possibilities"
            description="Open a venue and tap Add to comparison. Compare capacity, location, amenities and starting prices here."
            action="Discover venues"
            onPress={() => router.push('/')}
          />
        ) : pending ? (
          <VenueSkeleton />
        ) : failed ? (
          <ErrorState
            message={failed.error?.message}
            retry={() => venues.forEach((v) => v.refetch())}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {venues.map((query) => {
                const v = query.data!;
                const cover = v.media?.find((m) => m.isCover)?.url ?? v.media?.[0]?.url;
                return (
                  <View
                    key={v.id}
                    style={[ui.card, { width: 265, padding: 0, overflow: 'hidden' }]}
                  >
                    {cover ? (
                      <Image source={{ uri: cover }} style={{ width: '100%', height: 145 }} />
                    ) : (
                      <View
                        style={{
                          height: 145,
                          backgroundColor: '#2D213B',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="business-outline" color={colors.accent} size={35} />
                      </View>
                    )}
                    <View style={{ padding: 18 }}>
                      <View
                        style={[
                          ui.row,
                          { justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push(`/venue/${v.id}`)}
                          style={{ flex: 1 }}
                        >
                          <Text
                            style={{
                              color: colors.white,
                              fontSize: 20,
                              fontWeight: '600',
                              minHeight: 50,
                            }}
                          >
                            {v.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${v.name} from comparison`}
                          onPress={() => remove(v.id)}
                        >
                          <Icon name="close-circle-outline" size={20} />
                        </Pressable>
                      </View>
                      {[
                        { label: 'LOCATION', value: `${v.locality}, ${v.city}` },
                        { label: 'TYPE', value: categoryName(v.category) },
                        { label: 'STARTING RENTAL', value: rupees(v.rentalPricePaise) },
                        { label: 'SEATING CAPACITY', value: `${v.seatingCapacity} guests` },
                        { label: 'DINING CAPACITY', value: `${v.diningCapacity} guests` },
                        {
                          label: 'STANDING CAPACITY',
                          value: v.standingCapacity
                            ? `${v.standingCapacity} guests`
                            : 'Not specified',
                        },
                        {
                          label: 'AMENITIES',
                          value: v.amenities.join(' · ').replaceAll('_', ' ') || 'Not specified',
                        },
                      ].map((row) => (
                        <View
                          key={row.label}
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            paddingVertical: 16,
                            minHeight: row.label === 'AMENITIES' ? 110 : 81,
                          }}
                        >
                          <Text style={{ color: colors.gold, fontSize: 9, letterSpacing: 1.2 }}>
                            {row.label}
                          </Text>
                          <Text
                            style={{
                              color: colors.white,
                              fontSize: 13,
                              lineHeight: 20,
                              marginTop: 8,
                            }}
                          >
                            {row.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
        <Text style={[ui.body, { fontSize: 11, marginTop: 22 }]}>
          Starting prices are indicative. Request an individual quote for your event. Availability
          is not implied by inclusion in this comparison.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
