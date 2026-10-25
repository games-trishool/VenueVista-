import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, humanize } from '../src/api';
import { useSession } from '../src/session';
import type { Venue } from '../src/types';
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  styles,
} from '../src/ui';
interface Calendar {
  entries: { id: string; date: string; spaceId: string; status: string; note?: string }[];
  bookings: { spaceId: string; startsAt: string; endsAt: string }[];
  defaultStatus: string;
}
const indiaDate = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
export default function AvailabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, hydrated } = useSession();
  const client = useQueryClient();
  const [month, setMonth] = useState(indiaDate().slice(0, 7));
  const [date, setDate] = useState(indiaDate());
  const [spaceId, setSpaceId] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');
  const venue = useQuery({
    queryKey: ['partner-venue', id],
    queryFn: () => api<Venue>(`/partner/venues/${id}`),
    enabled: Boolean(token && id),
  });
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const calendar = useQuery({
    queryKey: ['partner-availability', id, month],
    queryFn: () => api<Calendar>(`/partner/venues/${id}/availability?month=${month}`),
    enabled: Boolean(token && id && validMonth),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!spaceId) throw new Error('Choose a bookable space.');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date < indiaDate()
      )
        throw new Error('Choose a valid date, today or in the future.');
      return api(`/partner/spaces/${spaceId}/availability`, {
        method: 'PUT',
        body: { date, status, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      });
    },
    onSuccess: () => {
      setMonth(date.slice(0, 7));
      void client.invalidateQueries({ queryKey: ['partner-availability', id] });
    },
  });
  if (hydrated && !token) return <Redirect href="/sign-in" />;
  return (
    <Screen>
      <View style={{ gap: 7 }}>
        <Text style={styles.eyebrow}>SPACE CALENDARS</Text>
        <Text style={styles.title}>Make availability clear.</Text>
        <Text style={styles.muted}>{venue.data?.name || 'Your venue'}</Text>
      </View>
      {venue.isLoading ? (
        <Loading />
      ) : venue.error ? (
        <ErrorState error={venue.error} retry={() => void venue.refetch()} />
      ) : (
        <Card>
          <Text style={styles.heading}>Update a space</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {venue.data?.spaces?.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={spaceId === s.id}
                onPress={() => setSpaceId(s.id)}
              />
            ))}
          </View>
          <Field label="Date (YYYY-MM-DD, India time)" value={date} onChangeText={setDate} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE', 'NOT_CONFIRMED'].map((s) => (
              <Chip
                key={s}
                label={humanize(s)}
                selected={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </View>
          <Field
            label="Internal notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Notice message="Available is a calendar declaration, not a booking confirmation. Tentative dates remain distinct from confirmed reservations. Confirmed bookings always take precedence." />
          <Button
            title="Save availability"
            onPress={() => save.mutate()}
            loading={save.isPending}
          />
          {save.error ? <Notice tone="error" message={errorMessage(save.error)} /> : null}
          {save.isSuccess ? (
            <Notice tone="success" message="Availability updated in the venue calendar." />
          ) : null}
        </Card>
      )}
      <Card>
        <Text style={styles.heading}>Your calendar</Text>
        <Field label="View month (YYYY-MM)" value={month} onChangeText={setMonth} />
        {!validMonth ? (
          <Notice tone="error" message="Enter a valid month, for example 2027-01." />
        ) : calendar.isLoading ? (
          <Loading />
        ) : calendar.error ? (
          <ErrorState error={calendar.error} retry={() => void calendar.refetch()} />
        ) : (
          <>
            <Text style={styles.muted}>Dates without an entry are not confirmed.</Text>
            {calendar.data?.entries?.length ? (
              calendar.data.entries.map((entry) => (
                <View key={entry.id} style={{ gap: 8, paddingVertical: 12 }}>
                  <View style={styles.spread}>
                    <Text style={styles.text}>{entry.date.slice(0, 10)}</Text>
                    <Badge status={entry.status} />
                  </View>
                  <Text style={styles.muted}>
                    {venue.data?.spaces.find((s) => s.id === entry.spaceId)?.name || 'All spaces'}
                  </Text>
                  {entry.note ? <Text style={styles.muted}>{entry.note}</Text> : null}
                </View>
              ))
            ) : (
              <Notice message="No availability declarations this month." />
            )}
            <Text style={styles.heading}>Confirmed reservations</Text>
            {calendar.data?.bookings?.length ? (
              calendar.data.bookings.map((b, i) => (
                <View key={`${b.spaceId}-${b.startsAt}-${i}`} style={{ gap: 7 }}>
                  <Text style={styles.text}>
                    {venue.data?.spaces.find((s) => s.id === b.spaceId)?.name || 'Space'}
                  </Text>
                  <Text style={styles.muted}>
                    {new Date(b.startsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to{' '}
                    {new Date(b.endsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </Text>
                  <Badge status="CONFIRMED" />
                </View>
              ))
            ) : (
              <Notice message="No confirmed reservations in this month." />
            )}
          </>
        )}
      </Card>
    </Screen>
  );
}
