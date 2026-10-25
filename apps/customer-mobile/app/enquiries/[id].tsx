import { useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { rupees, type Enquiry, type Quote } from '../../lib/types';
import { colors, ui } from '../../lib/theme';
import {
  Button,
  Chip,
  Divider,
  ErrorState,
  FormField,
  Icon,
  LoginPrompt,
  PageHeader,
  SectionTitle,
} from '../../components/ui';
import { VenueSkeleton } from '../../components/skeleton';
export default function EnquiryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const notify = useAppStore((s) => s.notify);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const enquiry = useQuery({
    queryKey: ['enquiry', id, token],
    queryFn: () => request<Enquiry>(`/enquiries/${id}`),
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });
  const send = useMutation({
    mutationFn: () =>
      request(`/enquiries/${id}/messages`, { method: 'POST', body: { body: message.trim() } }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
    },
  });
  const accept = useMutation({
    mutationFn: (quoteId: string) =>
      request(`/enquiries/${id}/quotes/${quoteId}/accept`, { method: 'POST', body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      notify('Quote accepted. The venue still needs to explicitly confirm your booking.');
    },
    onError: (e: Error) => notify(e.message),
  });
  async function acceptQuote(quote: Quote) {
    const text = `Accept this quotation for ${rupees(quote.amountPaise)}? This does not collect payment or create a confirmed booking. The venue must explicitly confirm availability.`;
    if (Platform.OS === 'web') {
      if (window.confirm(text)) accept.mutate(quote.id);
    } else
      Alert.alert('Accept quotation?', text, [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Accept quote', onPress: () => accept.mutate(quote.id) },
      ]);
  }
  const e = enquiry.data;
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={enquiry.isRefetching}
            onRefresh={() => {
              if (token) void enquiry.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <PageHeader
          title="Your celebration plans"
          subtitle="A direct conversation with the venue."
        />
        {!token ? (
          <LoginPrompt />
        ) : enquiry.isPending ? (
          <VenueSkeleton />
        ) : enquiry.isError ? (
          <ErrorState message={enquiry.error.message} retry={() => enquiry.refetch()} />
        ) : (
          e && (
            <>
              <View style={ui.card}>
                <Chip label={e.status.replaceAll('_', ' ')} selected />
                <Text
                  style={{ color: colors.white, fontSize: 23, fontWeight: '600', marginTop: 17 }}
                >
                  {e.venue?.name ?? 'Venue enquiry'}
                </Text>
                <Text style={[ui.body, { fontSize: 13, marginTop: 12 }]}>
                  {e.eventType.replaceAll('_', ' ')} · {e.eventDate.slice(0, 10)}
                  {'\n'}
                  {e.guestCount} guests{e.budgetPaise ? ` · Budget ${rupees(e.budgetPaise)}` : ''}
                </Text>
                {e.requirements && (
                  <Text style={[ui.body, { fontSize: 12, marginTop: 12 }]}>{e.requirements}</Text>
                )}
                <View style={[ui.row, { gap: 7, marginTop: 18 }]}>
                  <Icon
                    name={
                      e.status === 'CONFIRMED'
                        ? 'checkmark-circle-outline'
                        : 'information-circle-outline'
                    }
                    color={e.status === 'CONFIRMED' ? colors.success : colors.gold}
                    size={16}
                  />
                  <Text
                    style={{
                      color: e.status === 'CONFIRMED' ? colors.success : colors.gold,
                      fontSize: 11,
                      flex: 1,
                    }}
                  >
                    {e.status === 'CONFIRMED'
                      ? 'The venue explicitly confirmed this booking.'
                      : 'This enquiry is not a confirmed booking.'}
                  </Text>
                </View>
              </View>
              <Divider />
              <SectionTitle
                title="Your quotations"
                detail="Clear details. Room to ask questions."
              />
              {!e.quotes?.length ? (
                <Text style={ui.body}>
                  The venue hasn’t sent a quote yet. You’ll see it here when they do.
                </Text>
              ) : (
                e.quotes.map((q) => (
                  <View key={q.id} style={[ui.card, { marginBottom: 12, borderColor: '#5E4B37' }]}>
                    <Text style={{ color: colors.gold, fontSize: 28, fontWeight: '600' }}>
                      {rupees(q.amountPaise)}
                    </Text>
                    <Text style={[ui.body, { marginTop: 12 }]}>{q.description}</Text>
                    {q.validUntil && (
                      <Text style={[ui.body, { fontSize: 11, marginTop: 10 }]}>
                        Valid until{' '}
                        {new Date(q.validUntil).toLocaleDateString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                        })}
                      </Text>
                    )}
                    {q.acceptedAt ? (
                      <Text style={{ color: colors.success, fontSize: 12, marginTop: 16 }}>
                        ✓ You accepted this quote. Booking confirmation is a separate step.
                      </Text>
                    ) : !['CONFIRMED', 'CANCELLED', 'CLOSED'].includes(e.status) &&
                      (!q.validUntil || new Date(q.validUntil) > new Date()) ? (
                      <View style={{ marginTop: 17 }}>
                        <Button
                          label="Accept quotation"
                          loading={accept.isPending}
                          onPress={() => acceptQuote(q)}
                          secondary
                        />
                      </View>
                    ) : null}
                  </View>
                ))
              )}
              {!!e.siteVisits?.length && (
                <>
                  <Divider />
                  <SectionTitle title="Come see it for yourself" />
                  {e.siteVisits.map((visit) => (
                    <View key={visit.id} style={[ui.card, { marginBottom: 12 }]}>
                      <View style={[ui.row, { gap: 10 }]}>
                        <Icon name="calendar-outline" color={colors.gold} />
                        <Text style={{ color: colors.white, fontSize: 14 }}>
                          {new Date(visit.startsAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          IST
                        </Text>
                      </View>
                      {visit.note && (
                        <Text style={[ui.body, { fontSize: 12, marginTop: 10 }]}>{visit.note}</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
              <Divider />
              <SectionTitle title="Keep the conversation going" />
              {!e.messages?.length && (
                <Text style={[ui.body, { marginBottom: 20 }]}>
                  Ask about your plans, request a site visit, or share what would make the day
                  special.
                </Text>
              )}
              {e.messages?.map((m) => (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: m.authorId === user?.id ? '#352442' : colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    marginLeft: m.authorId === user?.id ? 25 : 0,
                    marginRight: m.authorId !== user?.id ? 25 : 0,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.accent, fontSize: 10, marginBottom: 8 }}>
                    {m.authorId === user?.id ? 'YOU' : 'VENUE TEAM'}
                  </Text>
                  <Text style={{ color: colors.white, fontSize: 13, lineHeight: 21 }}>
                    {m.body}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 9, marginTop: 9 }}>
                    {new Date(m.createdAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    IST
                  </Text>
                </View>
              ))}
              {!['CANCELLED', 'CLOSED'].includes(e.status) && (
                <View style={{ marginTop: 15 }}>
                  <FormField label="Your message">
                    <TextInput
                      accessibilityLabel="Your message to the venue"
                      value={message}
                      onChangeText={setMessage}
                      multiline
                      maxLength={2000}
                      placeholder="Tell us what you have in mind..."
                      placeholderTextColor={colors.muted}
                      style={[ui.input, { minHeight: 105, textAlignVertical: 'top' }]}
                    />
                  </FormField>
                  {send.isError && (
                    <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 15 }}>
                      {send.error.message}
                    </Text>
                  )}
                  <Button
                    label="Send message"
                    icon="paper-plane-outline"
                    loading={send.isPending}
                    disabled={!message.trim()}
                    onPress={() => send.mutate()}
                  />
                </View>
              )}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
