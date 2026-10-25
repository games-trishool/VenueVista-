import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { request } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import type { Enquiry } from '../../lib/types';
import { colors, ui } from '../../lib/theme';
import { Chip, EmptyState, ErrorState, Icon, LoginPrompt, PageHeader } from '../../components/ui';
import { VenueSkeleton } from '../../components/skeleton';
export default function Enquiries() {
  const token = useAppStore((s) => s.token);
  const enquiries = useQuery({
    queryKey: ['enquiries', token],
    queryFn: () => request<Enquiry[]>('/enquiries'),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView
        contentContainerStyle={ui.content}
        refreshControl={
          <RefreshControl
            refreshing={enquiries.isRefetching}
            onRefresh={() => {
              if (token) void enquiries.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <PageHeader
          title="Your celebrations, in motion"
          subtitle="Every conversation. Every possibility."
        />
        {!token ? (
          <LoginPrompt />
        ) : enquiries.isPending ? (
          <VenueSkeleton />
        ) : enquiries.isError ? (
          <ErrorState message={enquiries.error.message} retry={() => enquiries.refetch()} />
        ) : !enquiries.data.length ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="Start a beautiful conversation"
            description="Found somewhere you love? Request a quote and track the venue’s response here."
            action="Discover venues"
            onPress={() => router.push('/')}
          />
        ) : (
          enquiries.data.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              onPress={() => router.push(`/enquiries/${e.id}`)}
              style={[ui.card, { marginBottom: 15 }]}
            >
              <View style={[ui.row, { justifyContent: 'space-between', gap: 10 }]}>
                <Text style={{ flex: 1, color: colors.white, fontSize: 18, fontWeight: '600' }}>
                  {e.venue?.name ?? 'Venue enquiry'}
                </Text>
                <Icon name="chevron-forward" color={colors.accent} size={18} />
              </View>
              <Text style={[ui.body, { marginTop: 10, fontSize: 12 }]}>
                {e.eventType.replaceAll('_', ' ')} ·{' '}
                {new Date(`${e.eventDate.slice(0, 10)}T12:00:00+05:30`).toLocaleDateString(
                  'en-IN',
                  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' },
                )}
              </Text>
              <View style={[ui.row, { justifyContent: 'space-between', marginTop: 14 }]}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{e.guestCount} guests</Text>
                <Chip label={e.status.replaceAll('_', ' ')} selected />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
