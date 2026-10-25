import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, serif, ui } from '../../lib/theme';
import { useAppStore } from '../../lib/store';
import { request, queryString } from '../../lib/api';
import { categories, type Venue, type VenuePage } from '../../lib/types';
import { Icon, type IconName, SectionTitle, EmptyState, ErrorState } from '../../components/ui';
import { VenueCard } from '../../components/venue-card';
import { VenueSkeleton } from '../../components/skeleton';
import { CelebrationArch } from '../../components/celebration-arch';
export default function Home() {
  const city = useAppStore((s) => s.city);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const { width } = useWindowDimensions();
  const venues = useQuery({
    queryKey: ['venues', city.name],
    queryFn: ({ signal }) =>
      request<VenuePage>(`/venues?${queryString({ city: city.name, limit: 12 })}`, { signal }),
  });
  const wishlist = useQuery({
    queryKey: ['wishlist', token],
    queryFn: () => request<Venue[]>('/wishlist'),
    enabled: !!token,
  });
  const savedIds = new Set(wishlist.data?.map((v) => v.id));
  const featured = venues.data?.items.filter((v) => v.featured) ?? [];
  const search = () => router.push('/(tabs)/search');
  return (
    <SafeAreaView style={ui.page} edges={['top']}>
      <ScrollView
        contentContainerStyle={ui.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={venues.isRefetching}
            onRefresh={() => venues.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 28 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change location, currently ${city.name}`}
            onPress={() => router.push('/location')}
            style={[ui.row, { gap: 11, flex: 1 }]}
          >
            <View style={styles.pin}>
              <Icon name="location-outline" color={colors.gold} size={22} />
            </View>
            <View>
              <View style={[ui.row, { gap: 7 }]}>
                <Text style={{ fontSize: 16, color: colors.white, fontWeight: '600' }}>
                  {city.name}
                </Text>
                <Icon name="chevron-down" size={13} color={colors.white} />
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 5 }}>{city.state}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            <Icon name={user ? 'person' : 'person-outline'} color="#CFB7F3" size={19} />
          </Pressable>
        </View>
        <View style={[ui.row, { gap: 7, marginBottom: 22 }]}>
          <View style={styles.brandMark}>
            <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 25, marginTop: -2 }}>
              v
            </Text>
          </View>
          <Text
            style={{ fontFamily: serif, color: colors.white, fontSize: 23, letterSpacing: -0.8 }}
          >
            venue<Text style={{ color: '#B79ADB' }}>vista</Text>
            <Text style={{ color: colors.gold }}>.</Text>
          </Text>
          <View style={{ height: 1, backgroundColor: colors.border, flex: 1, marginLeft: 15 }} />
          <Text style={{ color: colors.muted, fontSize: 9, letterSpacing: 1.5, marginLeft: 7 }}>
            CELEBRATE BETTER
          </Text>
        </View>
        <LinearGradient
          colors={['#2B203C', '#21192F', '#19151F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: width > 600 ? 25 : -58,
              top: width > 600 ? 0 : 35,
              opacity: width > 600 ? 1 : 0.55,
            }}
          >
            <CelebrationArch size={width > 600 ? 280 : 230} />
          </View>
          <View style={{ maxWidth: width > 600 ? '65%' : '80%', zIndex: 1 }}>
            <View style={[ui.row, { gap: 7, marginBottom: 17 }]}>
              <Icon name="sparkles" size={12} color={colors.gold} />
              <Text style={[ui.eyebrow, { fontSize: 9 }]}>LIFE DESERVES A LITTLE EXTRA</Text>
            </View>
            <Text
              style={[
                styles.heroTitle,
                { fontSize: width > 600 ? 52 : 40, lineHeight: width > 600 ? 58 : 46 },
              ]}
            >
              Good places.{'\n'}Great memories.
            </Text>
            <Text
              style={[ui.body, { maxWidth: 290, fontSize: 12, marginTop: 16, color: '#C0B4CE' }]}
            >
              Discover a beautiful setting for every{'\n'}chapter worth celebrating.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={search}
              style={[
                ui.row,
                { gap: 10, marginTop: 24, alignSelf: 'flex-start', paddingVertical: 7 },
              ]}
            >
              <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '600' }}>
                Find your place
              </Text>
              <Icon name="arrow-forward" color={colors.gold} size={18} />
            </Pressable>
          </View>
          <View style={styles.heroBottom}>
            <View style={{ width: 4, height: 4, backgroundColor: colors.gold, borderRadius: 2 }} />
            <Text style={{ color: '#A291B3', fontSize: 9, letterSpacing: 1.1 }}>
              ANDHRA PRADESH & TELANGANA
            </Text>
          </View>
        </LinearGradient>
        <Pressable accessibilityRole="button" onPress={search} style={styles.search}>
          <Icon name="search-outline" color={colors.accent} size={21} />
          <Text style={{ color: '#A39AAA', fontSize: 13, flex: 1 }}>
            Search venues, localities, occasions...
          </Text>
          <View style={{ height: 20, width: 1, backgroundColor: colors.border }} />
          <Icon name="options-outline" color={colors.accent} size={20} />
        </Pressable>
        <View style={{ marginTop: 32 }}>
          <SectionTitle
            title="What are you celebrating?"
            detail="A space for every kind of together."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 13, paddingBottom: 5 }}
          >
            {categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/search', params: { category: category.id } })
                }
                style={{ width: 91, alignItems: 'center' }}
              >
                <LinearGradient
                  colors={['#2B2235', '#1C1823']}
                  style={[styles.category, { borderColor: `${category.color}30` }]}
                >
                  <View
                    style={{
                      position: 'absolute',
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: `${category.color}0D`,
                    }}
                  />
                  <Icon name={category.icon as IconName} size={30} color={category.color} />
                  <View style={{ position: 'absolute', right: 12, top: 10 }}>
                    <Icon name="sparkles" size={8} color={`${category.color}90`} />
                  </View>
                </LinearGradient>
                <Text
                  style={{
                    color: '#C9C1D2',
                    fontSize: 10,
                    textAlign: 'center',
                    lineHeight: 16,
                    marginTop: 10,
                  }}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View
          style={{
            marginTop: 32,
            marginBottom: 30,
            padding: 19,
            borderRadius: 18,
            backgroundColor: '#201C25',
            borderWidth: 1,
            borderColor: '#39313F',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
          }}
        >
          <View style={{ borderColor: '#695639', borderWidth: 1, padding: 9, borderRadius: 11 }}>
            <Icon name="shield-checkmark-outline" size={21} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E5D7B9', fontSize: 12, fontWeight: '600' }}>
              A little less searching. A lot more celebrating.
            </Text>
            <Text style={{ color: '#9C93A6', fontSize: 11, lineHeight: 17, marginTop: 4 }}>
              Explore approved listings. Connect directly. Plan with confidence.
            </Text>
          </View>
        </View>
        {featured.length > 0 && (
          <View style={{ marginBottom: 22 }}>
            <SectionTitle
              title="In the spotlight"
              detail="Distinctive places, extraordinary possibilities."
            />
            {featured.map((v) => (
              <VenueCard key={v.id} venue={v} saved={savedIds.has(v.id)} />
            ))}
          </View>
        )}
        <SectionTitle
          title={`Discover ${city.name}`}
          detail={
            venues.data?.total
              ? `${venues.data.total} approved ${venues.data.total === 1 ? 'venue' : 'venues'} to make it memorable`
              : 'Your celebration, your kind of place.'
          }
          action="View all"
          onPress={search}
        />
        {venues.isPending ? (
          <>
            <VenueSkeleton />
            <VenueSkeleton />
          </>
        ) : venues.isError ? (
          <ErrorState message={venues.error.message} retry={() => venues.refetch()} />
        ) : !venues.data.items.length ? (
          <EmptyState
            title="Something wonderful is on its way"
            description={`There are no approved venues in ${city.name} yet. Try another city, or return as our community grows.`}
            icon="flower-outline"
            action="Explore another city"
            onPress={() => router.push('/location')}
          />
        ) : (
          venues.data.items.map((v) => (
            <VenueCard key={v.id} venue={v} saved={savedIds.has(v.id)} />
          ))
        )}
        <View style={{ alignItems: 'center', marginTop: 35, marginBottom: 10 }}>
          <Icon name="sparkles-outline" color="#6B596D" size={19} />
          <Text
            style={{
              color: '#9F8DAB',
              fontSize: 24,
              fontFamily: serif,
              textAlign: 'center',
              marginTop: 13,
            }}
          >
            For all your{'\n'}beautiful beginnings.
          </Text>
          <Text style={{ color: '#665D70', fontSize: 8, letterSpacing: 2.3, marginTop: 15 }}>
            VENUEVISTA · MADE FOR YOUR MOMENTS
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  pin: {
    width: 39,
    height: 39,
    borderWidth: 1,
    borderColor: '#42334B',
    backgroundColor: '#241B2C',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 41,
    height: 41,
    backgroundColor: '#30203F',
    borderWidth: 1,
    borderColor: '#674A80',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    height: 29,
    width: 29,
    borderRadius: 8,
    backgroundColor: '#312638',
    borderColor: '#5D4D51',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#493455',
    borderRadius: 25,
    padding: 25,
    overflow: 'hidden',
  },
  heroTitle: { color: '#F5EBE5', fontFamily: serif, letterSpacing: -1.3, lineHeight: 46 },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderColor: '#BCA0D21A',
    marginTop: 24,
    paddingTop: 14,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#43384E',
    borderRadius: 15,
    backgroundColor: '#201A29',
    gap: 12,
    marginTop: 23,
  },
  category: {
    width: 82,
    height: 82,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
