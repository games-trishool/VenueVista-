import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, ui } from '../lib/theme';
import { categoryName, rupees, type Venue } from '../lib/types';
import { request } from '../lib/api';
import { useAppStore } from '../lib/store';
import { Icon } from './ui';
export function VenueCard({ venue, saved = false }: { venue: Venue; saved?: boolean }) {
  const queryClient = useQueryClient();
  const token = useAppStore((s) => s.token);
  const notify = useAppStore((s) => s.notify);
  const save = useMutation({
    mutationFn: () => request(`/wishlist/${venue.id}`, { method: saved ? 'DELETE' : 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      notify(saved ? 'Venue removed from your wishlist.' : 'Saved for a future celebration.');
    },
    onError: (e: Error) => notify(e.message),
  });
  const cover = venue.media?.find((item) => item.isCover)?.url ?? venue.media?.[0]?.url;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${venue.name}`}
      onPress={() => router.push(`/venue/${venue.id}`)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.cover}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={venue.name}
          />
        ) : (
          <LinearGradient
            colors={['#3B2E50', '#1D2330']}
            style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <Icon name="business-outline" size={50} color="#78688E" />
            <Text style={{ color: '#B7A7CA', fontSize: 11, marginTop: 8 }}>
              Photographs coming soon
            </Text>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', '#11101580']} style={StyleSheet.absoluteFill} />
        <View style={styles.badge}>
          <Text
            style={{ color: colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}
          >
            {venue.isDemo || venue.isDevelopment
              ? 'DEVELOPMENT LISTING'
              : categoryName(venue.category).toUpperCase()}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          disabled={save.isPending}
          onPress={(e) => {
            e.stopPropagation();
            if (!token) router.push('/profile');
            else save.mutate();
          }}
          style={styles.save}
        >
          <Icon
            name={saved ? 'heart' : 'heart-outline'}
            size={21}
            color={saved ? '#E5ABBC' : colors.white}
          />
        </Pressable>
      </View>
      <View style={{ padding: 18 }}>
        <View style={[ui.row, { justifyContent: 'space-between', gap: 8 }]}>
          <Text numberOfLines={1} style={styles.name}>
            {venue.name}
          </Text>
          {venue.verified && <Icon name="checkmark-circle" size={18} color={colors.success} />}
        </View>
        <View style={[ui.row, { gap: 5, marginTop: 7 }]}>
          <Icon name="location-outline" size={13} />
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
            {venue.locality ? `${venue.locality}, ` : ''}
            {venue.city}
          </Text>
        </View>
        <View style={[ui.row, { gap: 15, marginTop: 15, flexWrap: 'wrap' }]}>
          <View style={[ui.row, { gap: 5 }]}>
            <Icon name="people-outline" size={14} />
            <Text style={styles.meta}>{venue.seatingCapacity} seating</Text>
          </View>
          <View style={[ui.row, { gap: 5 }]}>
            <Icon name="restaurant-outline" size={14} />
            <Text style={styles.meta}>{venue.diningCapacity} dining</Text>
          </View>
          <Text style={styles.meta}>{venue.amenities?.includes('AC') ? '❄ AC' : 'Non-AC'}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 15 }} />
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Starting from{' '}
            <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 17 }}>
              {rupees(venue.rentalPricePaise)}
            </Text>
          </Text>
          <Icon name="arrow-up-right-box-outline" color={colors.accent} size={19} />
        </View>
        <Text style={{ color: '#7E7789', fontSize: 10, marginTop: 5 }}>
          Indicative rental · final quote from the venue
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    width: '100%',
  },
  cover: { height: 216, backgroundColor: '#282034' },
  badge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 7,
    backgroundColor: '#17131CBA',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  save: {
    position: 'absolute',
    right: 13,
    top: 13,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16121DAA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.white, fontWeight: '600', fontSize: 19, flex: 1 },
  meta: { color: '#C7C1D0', fontSize: 11 },
});
