import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as LocationService from 'expo-location';
import { colors, ui } from '../lib/theme';
import { request } from '../lib/api';
import { useAppStore } from '../lib/store';
import type { Location } from '../lib/types';
import { Button, ErrorState, Icon, PageHeader, SectionTitle } from '../components/ui';
export default function LocationPicker() {
  const [search, setSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const selected = useAppStore((s) => s.city);
  const recent = useAppStore((s) => s.recentCities);
  const setCity = useAppStore((s) => s.setCity);
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: () => request<Location[]>('/locations'),
    staleTime: 5 * 60 * 1000,
  });
  const items =
    locations.data?.filter((c) =>
      `${c.name} ${c.state}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  async function choose(city: Location) {
    await setCity(city);
    router.back();
  }
  async function locate() {
    setGpsLoading(true);
    setGpsError('');
    try {
      const permission = await LocationService.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted')
        throw new Error('Location access was not granted. You can still choose a city below.');
      const position = await LocationService.getCurrentPositionAsync({
        accuracy: LocationService.Accuracy.Balanced,
      });
      const candidates =
        locations.data
          ?.filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
          .map((c) => ({
            city: c,
            distance: distance(
              position.coords.latitude,
              position.coords.longitude,
              c.latitude!,
              c.longitude!,
            ),
          }))
          .sort((a, b) => a.distance - b.distance) ?? [];
      if (!candidates.length)
        throw new Error(
          'Nearby city coordinates aren’t available yet. Please choose a city manually.',
        );
      if (candidates[0].distance > 100)
        throw new Error(
          'We’re currently available in Andhra Pradesh and Telangana. Choose a supported city to explore.',
        );
      await choose(candidates[0].city);
    } catch (e) {
      setGpsError(
        e instanceof Error ? e.message : 'Location is unavailable. Please select your city below.',
      );
    } finally {
      setGpsLoading(false);
    }
  }
  function row(city: Location) {
    return (
      <Pressable
        key={city.name}
        accessibilityRole="button"
        onPress={() => choose(city)}
        style={[
          ui.row,
          { paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 13 },
        ]}
      >
        <View
          style={{
            width: 37,
            height: 37,
            borderRadius: 12,
            backgroundColor: '#2A2038',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="location-outline" color={colors.accent} size={19} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '500' }}>{city.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{city.state}</Text>
        </View>
        <Icon
          name={selected.name === city.name ? 'checkmark-circle' : 'chevron-forward'}
          size={18}
          color={selected.name === city.name ? colors.accent : colors.muted}
        />
      </Pressable>
    );
  }
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <PageHeader
          title="Where are we celebrating?"
          subtitle="Find a place a little closer to you."
        />
        <View style={[ui.row, ui.input, { gap: 10, paddingVertical: 3 }]}>
          <Icon name="search-outline" color={colors.accent} />
          <TextInput
            accessibilityLabel="Search supported cities"
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Search your city"
            placeholderTextColor={colors.muted}
            style={{ color: colors.white, flex: 1, minHeight: 45, fontSize: 14 }}
          />
        </View>
        <View style={{ marginVertical: 20 }}>
          <Button
            label="Use my current location"
            icon="navigate-outline"
            loading={gpsLoading}
            onPress={locate}
            secondary
          />
          <Text style={[ui.body, { fontSize: 11, marginTop: 9 }]}>
            Optional. You can browse without location access.
          </Text>
          {gpsError && (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.danger, fontSize: 12, lineHeight: 19, marginTop: 10 }}
            >
              {gpsError}
            </Text>
          )}
        </View>
        {!search && recent.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionTitle title="Recently explored" />
            {recent.map(row)}
          </View>
        )}
        <SectionTitle
          title={search ? 'Matching cities' : 'Explore our cities'}
          detail="Andhra Pradesh & Telangana. More places coming soon."
        />
        {locations.isPending ? (
          <Text style={ui.body}>Loading supported cities...</Text>
        ) : locations.isError ? (
          <ErrorState retry={() => locations.refetch()} message={locations.error.message} />
        ) : items.length ? (
          items.map(row)
        ) : (
          <Text style={ui.body}>No supported city matches that search. Try another city name.</Text>
        )}
        <View style={[ui.card, { marginTop: 28 }]}>
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '600' }}>
            Looking for a locality or PIN code?
          </Text>
          <Text style={[ui.body, { marginTop: 6, fontSize: 12 }]}>
            Choose your city, then use venue search to narrow down a neighbourhood or PIN code.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
