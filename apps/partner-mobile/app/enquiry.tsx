import { useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams, Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, humanize, money } from '../src/api';
import { useSession } from '../src/session';
import { BookingConfirmation } from '../src/BookingConfirmation';
import type { Enquiry } from '../src/types';
import {
  Badge,
  Button,
  Card,
  Chip,
  colors,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  styles,
} from '../src/ui';
type Action = 'quote' | 'message' | 'visit' | 'status';
export default function EnquiryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, hydrated } = useSession();
  const client = useQueryClient();
  const [action, setAction] = useState<Action>('quote');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitNotes, setVisitNotes] = useState('');
  const [status, setStatus] = useState('VIEWED');
  const [validation, setValidation] = useState('');
  const query = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => api<Enquiry>(`/enquiries/${id}`),
    enabled: Boolean(token && id),
  });
  const mutation = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) =>
      api(`/enquiries/${id}/${path}`, { method: 'POST', body }),
    onSuccess: () => {
      setValidation('');
      setDescription('');
      setAmount('');
      setMessage('');
      setVisitNotes('');
      void client.invalidateQueries({ queryKey: ['enquiry', id] });
      void client.invalidateQueries({ queryKey: ['enquiries'] });
      void client.invalidateQueries({ queryKey: ['partner-dashboard'] });
    },
  });
  const submit = () => {
    setValidation('');
    mutation.reset();
    if (action === 'quote') {
      const amountPaise = Math.round(Number(amount) * 100);
      if (
        !Number.isFinite(amountPaise) ||
        amountPaise <= 0 ||
        amountPaise > 2000000000 ||
        !description.trim()
      )
        return setValidation(
          'Enter a valid positive INR amount and describe exactly what your quote includes.',
        );
      mutation.mutate({ path: 'quotes', body: { amountPaise, description: description.trim() } });
    } else if (action === 'message') {
      if (!message.trim()) return setValidation('Write a message before sending.');
      mutation.mutate({ path: 'messages', body: { body: message.trim() } });
    } else if (action === 'visit') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime))
        return setValidation(
          'Enter a valid visit date (YYYY-MM-DD) and time (HH:mm), in India time.',
        );
      const date = new Date(`${visitDate}T${visitTime}:00+05:30`);
      if (!Number.isFinite(date.getTime()) || date <= new Date())
        return setValidation('The site visit must be scheduled in the future.');
      mutation.mutate({
        path: 'site-visits',
        body: { scheduledAt: date.toISOString(), notes: visitNotes.trim() || undefined },
      });
    } else mutation.mutate({ path: 'status', body: { status } });
  };
  if (hydrated && !token) return <Redirect href="/sign-in" />;
  const e = query.data;
  return (
    <Screen>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : e ? (
        <>
          <View style={{ gap: 10 }}>
            <Text style={styles.eyebrow}>CUSTOMER CONVERSATION</Text>
            <Text style={styles.title}>{e.venue?.name || 'Venue enquiry'}</Text>
            <Badge status={e.status} />
          </View>
          <Card>
            <Text style={styles.heading}>
              {e.eventType} · {e.guestCount} guests
            </Text>
            <Text style={styles.text}>
              {new Date(e.eventDate).toLocaleDateString('en-IN', {
                dateStyle: 'long',
                timeZone: 'Asia/Kolkata',
              })}
            </Text>
            <Text style={styles.muted}>{e.user?.displayName || 'Customer'}</Text>
            {e.budgetPaise ? (
              <Text style={{ color: colors.gold }}>Approximate budget {money(e.budgetPaise)}</Text>
            ) : null}
            {e.requirements ? <Text style={styles.muted}>{e.requirements}</Text> : null}
            <Notice message="This is an enquiry, not a booking. A quote or a scheduled visit does not reserve the space." />
          </Card>
          <Card>
            <Text style={styles.heading}>Keep the conversation moving</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
              {(['quote', 'message', 'visit', 'status'] as Action[]).map((a) => (
                <Chip
                  key={a}
                  label={
                    a === 'quote'
                      ? 'Send quote'
                      : a === 'message'
                        ? 'Message'
                        : a === 'visit'
                          ? 'Site visit'
                          : 'Status'
                  }
                  selected={action === a}
                  onPress={() => {
                    setAction(a);
                    setValidation('');
                    mutation.reset();
                  }}
                />
              ))}
            </ScrollView>
            {action === 'quote' ? (
              <>
                <Field
                  label="Quote amount (INR)"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="For example, 75000"
                />
                <Field
                  label="What’s included and excluded"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={4000}
                  placeholder="Rental period, catering, decoration, taxes, and any additional charges…"
                />
                <Notice message="Enter the total quote in rupees. The amount is stored as integer paise. Your customer can review this before accepting." />
              </>
            ) : action === 'message' ? (
              <Field
                label="Message to customer"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={4000}
                placeholder="Share an update or ask a question…"
              />
            ) : action === 'visit' ? (
              <>
                <Field
                  label="Site visit date (YYYY-MM-DD)"
                  value={visitDate}
                  onChangeText={setVisitDate}
                  placeholder="2027-01-20"
                />
                <Field
                  label="India time (HH:mm, 24-hour)"
                  value={visitTime}
                  onChangeText={setVisitTime}
                  placeholder="10:00"
                />
                <Field
                  label="Meeting instructions (optional)"
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                  multiline
                  placeholder="Where to meet and who to ask for…"
                />
              </>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['VIEWED', 'RESPONDED', 'NEGOTIATING', 'CANCELLED', 'CLOSED'].map((s) => (
                  <Chip
                    key={s}
                    label={humanize(s)}
                    selected={status === s}
                    onPress={() => setStatus(s)}
                  />
                ))}
              </View>
            )}
            <Button
              title={
                action === 'quote'
                  ? 'Send quotation'
                  : action === 'message'
                    ? 'Send message'
                    : action === 'visit'
                      ? 'Propose site visit'
                      : `Mark ${humanize(status).toLowerCase()}`
              }
              loading={mutation.isPending}
              onPress={submit}
            />
            {validation ? <Notice tone="error" message={validation} /> : null}
            {mutation.error ? <Notice tone="error" message={errorMessage(mutation.error)} /> : null}
            {mutation.isSuccess ? (
              <Notice
                tone="success"
                message="Update sent. The customer can see it in their enquiry tracker."
              />
            ) : null}
          </Card>
          <BookingConfirmation enquiry={e} />
          <Text style={styles.heading}>Quotations</Text>
          {e.quotes?.length ? (
            e.quotes.map((q) => (
              <Card key={q.id}>
                <Text style={[styles.heading, { color: colors.gold }]}>{money(q.amountPaise)}</Text>
                <Text style={styles.text}>{q.description}</Text>
                <Text style={styles.muted}>
                  Sent{' '}
                  {new Date(q.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  {q.validUntil
                    ? ` · Valid until ${new Date(q.validUntil).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                    : ''}
                </Text>
              </Card>
            ))
          ) : (
            <Notice message="No quotations sent yet." />
          )}
          <Text style={styles.heading}>Site visits</Text>
          {e.siteVisits?.length ? (
            e.siteVisits.map((v) => (
              <Card key={v.id}>
                <Text style={styles.text}>
                  {new Date(v.startsAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  IST
                </Text>
                {v.note ? <Text style={styles.muted}>{v.note}</Text> : null}
              </Card>
            ))
          ) : (
            <Notice message="No site visits scheduled." />
          )}
          <Text style={styles.heading}>Messages</Text>
          {e.messages?.length ? (
            e.messages.map((m) => (
              <Card key={m.id}>
                <Text style={styles.text}>{m.body}</Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  {new Date(m.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </Text>
              </Card>
            ))
          ) : (
            <Notice message="No messages yet. Keep all your event conversations in one place." />
          )}
        </>
      ) : null}
    </Screen>
  );
}
