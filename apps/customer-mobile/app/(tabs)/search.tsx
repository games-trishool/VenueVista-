import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, ui } from '../../lib/theme';
import { request, queryString } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { categories, type Venue, type VenuePage } from '../../lib/types';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  FormField,
  Icon,
  PageHeader,
} from '../../components/ui';
import { VenueCard } from '../../components/venue-card';
import { VenueSkeleton } from '../../components/skeleton';
type Filters = { min: string; max: string; capacity: string; amenities: string[]; sort: string };
const defaults: Filters = { min: '', max: '', capacity: '', amenities: [], sort: 'relevance' };
export default function Search() {
  const params = useLocalSearchParams<{ category?: string }>();
  const city = useAppStore((s) => s.city);
  const token = useAppStore((s) => s.token);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState(params.category ?? '');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);
  useEffect(() => {
    setPage(1);
  }, [city.name, debounced, category, filters]);
  const venues = useQuery({
    queryKey: ['search', city.name, debounced, category, filters, page],
    queryFn: ({ signal }) =>
      request<VenuePage>(
        `/venues?${queryString({ city: city.name, q: debounced, category, minPrice: filters.min ? Number(filters.min) * 100 : undefined, maxPrice: filters.max ? Number(filters.max) * 100 : undefined, minCapacity: filters.capacity || undefined, amenities: filters.amenities.join(','), sort: filters.sort, page, limit: 12 })}`,
        { signal },
      ),
  });
  const wishlist = useQuery({
    queryKey: ['wishlist', token],
    queryFn: () => request<Venue[]>('/wishlist'),
    enabled: !!token,
  });
  const savedIds = new Set(wishlist.data?.map((v) => v.id));
  const filterCount =
    Number(!!filters.min) +
    Number(!!filters.max) +
    Number(!!filters.capacity) +
    filters.amenities.length;
  function apply() {
    if (
      [draft.min, draft.max, draft.capacity].some(
        (v) => v && (!/^\d+$/.test(v) || Number(v) > 100000000),
      )
    ) {
      setError('Please enter valid whole numbers.');
      return;
    }
    if (draft.min && draft.max && Number(draft.min) > Number(draft.max)) {
      setError('Maximum budget must be at least the minimum.');
      return;
    }
    setFilters(draft);
    setModal(false);
    setError('');
  }
  return (
    <SafeAreaView style={ui.page} edges={['top']}>
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <PageHeader
          title="Find your kind of place"
          subtitle="A little searching. A beautiful beginning."
          back={false}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/location')}
          style={[ui.row, { gap: 7, marginBottom: 22 }]}
        >
          <Icon name="location-outline" color={colors.gold} size={15} />
          <Text style={{ color: colors.gold, fontSize: 12 }}>{city.name}</Text>
          <Icon name="chevron-down" color={colors.gold} size={12} />
        </Pressable>
        <View style={[ui.row, ui.input, { paddingVertical: 3, gap: 10 }]}>
          <Icon name="search-outline" color={colors.accent} />
          <TextInput
            accessibilityLabel="Search by venue name, locality, PIN or event"
            value={query}
            onChangeText={setQuery}
            placeholder="Name, locality, PIN or occasion"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, minHeight: 46, color: colors.white, fontSize: 14 }}
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
            >
              <Icon name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 18 }}
        >
          <Chip label="All venues" selected={!category} onPress={() => setCategory('')} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              selected={category === c.id}
              onPress={() => setCategory(category === c.id ? '' : c.id)}
            />
          ))}
        </ScrollView>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 21 }]}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {venues.data
              ? `${venues.data.total} ${venues.data.total === 1 ? 'place' : 'places'} to explore`
              : 'Finding your perfect setting...'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(filters);
              setModal(true);
            }}
            style={[ui.row, { gap: 6, backgroundColor: '#302240', padding: 10, borderRadius: 11 }]}
          >
            <Icon name="options-outline" size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 12 }}>
              Filters{filterCount ? ` · ${filterCount}` : ''}
            </Text>
          </Pressable>
        </View>
        {venues.isPending ? (
          <>
            <VenueSkeleton />
            <VenueSkeleton />
          </>
        ) : venues.isError ? (
          <ErrorState message={venues.error.message} retry={() => venues.refetch()} />
        ) : !venues.data.items.length ? (
          <EmptyState
            icon="search-outline"
            title="The perfect place is still out there"
            description="No approved venues match this search. Try fewer filters, a different keyword, or another city."
            action="Clear search & filters"
            onPress={() => {
              setQuery('');
              setCategory('');
              setFilters(defaults);
            }}
          />
        ) : (
          venues.data.items.map((v) => (
            <VenueCard key={v.id} venue={v} saved={savedIds.has(v.id)} />
          ))
        )}
        {!!venues.data?.total && venues.data.total > 12 && (
          <View style={[ui.row, { gap: 12, justifyContent: 'space-between', marginTop: 8 }]}>
            <Button
              secondary
              label="Previous"
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            />
            <Text style={ui.body}>
              {page} / {Math.ceil(venues.data.total / 12)}
            </Text>
            <Button
              secondary
              label="Next"
              disabled={page * 12 >= venues.data.total}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        )}
        <Text style={[ui.body, { fontSize: 11, marginTop: 18, textAlign: 'center' }]}>
          Prices are starting rentals. Contact the venue for a final quote.
        </Text>
      </ScrollView>
      <Modal
        visible={modal}
        animationType="slide"
        transparent
        onRequestClose={() => setModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' }}>
          <SafeAreaView
            style={{
              maxHeight: '92%',
              backgroundColor: colors.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                maxWidth: 650,
                width: '100%',
                alignSelf: 'center',
              }}
              keyboardShouldPersistTaps="handled"
            >
              <PageHeader
                title="Make it yours"
                subtitle="A few details to find a better fit."
                back={false}
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close filters"
                    onPress={() => setModal(false)}
                  >
                    <Icon name="close" />
                  </Pressable>
                }
              />
              <Text style={[ui.eyebrow, { marginBottom: 18 }]}>YOUR BUDGET · INR</Text>
              <View style={[ui.row, { gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <FormField label="Minimum rental">
                    <TextInput
                      style={ui.input}
                      placeholder="₹ Min"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      value={draft.min}
                      onChangeText={(v) => setDraft((d) => ({ ...d, min: v }))}
                    />
                  </FormField>
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Maximum rental">
                    <TextInput
                      style={ui.input}
                      placeholder="₹ Max"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      value={draft.max}
                      onChangeText={(v) => setDraft((d) => ({ ...d, max: v }))}
                    />
                  </FormField>
                </View>
              </View>
              <FormField label="Minimum seating capacity">
                <TextInput
                  accessibilityLabel="Minimum seating capacity"
                  style={ui.input}
                  placeholder="How many guests?"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  value={draft.capacity}
                  onChangeText={(v) => setDraft((d) => ({ ...d, capacity: v }))}
                />
              </FormField>
              <Text style={[ui.eyebrow, { marginBottom: 14, marginTop: 8 }]}>
                THE LITTLE EXTRAS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
                {[
                  'AC',
                  'PARKING',
                  'POWER_BACKUP',
                  'LIFT',
                  'WHEELCHAIR_ACCESS',
                  'BRIDAL_ROOM',
                  'GUEST_ROOMS',
                  'STAGE',
                  'KITCHEN',
                  'CATERING',
                  'DECORATION',
                  'WIFI',
                  'LAWN',
                  'POOL',
                ].map((a) => (
                  <Chip
                    key={a}
                    label={a.replaceAll('_', ' ')}
                    selected={draft.amenities.includes(a)}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        amenities: d.amenities.includes(a)
                          ? d.amenities.filter((x) => x !== a)
                          : [...d.amenities, a],
                      }))
                    }
                  />
                ))}
              </View>
              <Text style={[ui.eyebrow, { marginBottom: 14 }]}>SORT YOUR DISCOVERIES</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
                {[
                  { value: 'relevance', label: 'Recommended' },
                  { value: 'price_asc', label: 'Price: low to high' },
                  { value: 'price_desc', label: 'Price: high to low' },
                  { value: 'capacity', label: 'Largest capacity' },
                ].map((s) => (
                  <Chip
                    key={s.value}
                    label={s.label}
                    selected={draft.sort === s.value}
                    onPress={() => setDraft((d) => ({ ...d, sort: s.value }))}
                  />
                ))}
              </View>
              {error && (
                <Text style={{ color: colors.danger, marginBottom: 16, fontSize: 12 }}>
                  {error}
                </Text>
              )}
              <View style={[ui.row, { gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Button secondary label="Reset" onPress={() => setDraft(defaults)} />
                </View>
                <View style={{ flex: 2 }}>
                  <Button label="Apply filters" onPress={apply} />
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
