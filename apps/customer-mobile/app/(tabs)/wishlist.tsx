import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../lib/store';
import { request } from '../../lib/api';
import type { Venue } from '../../lib/types';
import { colors, ui } from '../../lib/theme';
import { EmptyState, ErrorState, LoginPrompt, PageHeader } from '../../components/ui';
import { VenueCard } from '../../components/venue-card';
import { VenueSkeleton } from '../../components/skeleton';
export default function Wishlist() {
  const token = useAppStore((s) => s.token);
  const venues = useQuery({
    queryKey: ['wishlist', token],
    queryFn: () => request<Venue[]>('/wishlist'),
    enabled: !!token,
  });
  return (
    <SafeAreaView style={ui.page} edges={['top']}>
      <ScrollView
        contentContainerStyle={ui.content}
        refreshControl={
          <RefreshControl
            refreshing={venues.isRefetching}
            onRefresh={() => {
              if (token) void venues.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <PageHeader
          title="Places close to your heart"
          subtitle="A little collection of beautiful possibilities."
          back={false}
        />
        {!token ? (
          <LoginPrompt description="Sign in to save your favourite venues and pick up where you left off." />
        ) : venues.isPending ? (
          <VenueSkeleton />
        ) : venues.isError ? (
          <ErrorState retry={() => venues.refetch()} message={venues.error.message} />
        ) : !venues.data.length ? (
          <EmptyState
            icon="heart-outline"
            title="Save a little inspiration"
            description="Tap the heart on a venue you love. All your favourites will be waiting here."
            action="Discover venues"
            onPress={() => router.push('/')}
          />
        ) : (
          venues.data.map((v) => <VenueCard key={v.id} venue={v} saved />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
