import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage, money } from './api';
import type { Enquiry, Venue } from './types';
import { Button, Card, Chip, colors, Field, Notice, styles } from './ui';
export function BookingConfirmation({ enquiry }: { enquiry: Enquiry }) {
  const client = useQueryClient();
  const [spaceId, setSpaceId] = useState(enquiry.spaceId || '');
  const [quoteId, setQuoteId] = useState('');
  const [startsDate, setStartsDate] = useState(enquiry.eventDate.slice(0, 10));
  const [endsDate, setEndsDate] = useState(enquiry.eventDate.slice(0, 10));
  const [startsTime, setStartsTime] = useState('09:00');
  const [endsTime, setEndsTime] = useState('21:00');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState('');
  const accepted = enquiry.quotes.filter((q) => q.acceptedAt);
  const venue = useQuery({
    queryKey: ['partner-venue', enquiry.venueId],
    queryFn: () => api<Venue>(`/partner/venues/${enquiry.venueId}`),
    enabled: accepted.length > 0 && !['CONFIRMED', 'CANCELLED', 'CLOSED'].includes(enquiry.status),
  });
  const book = useMutation({
    mutationFn: (body: {
      spaceId: string;
      quoteId: string;
      startsAt: string;
      endsAt: string;
      confirmation: true;
    }) => api(`/enquiries/${enquiry.id}/confirm`, { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['enquiry', enquiry.id] });
      void client.invalidateQueries({ queryKey: ['enquiries'] });
      void client.invalidateQueries({ queryKey: ['partner-dashboard'] });
    },
  });
  if (enquiry.booking)
    return (
      <Card>
        <Text style={styles.heading}>Confirmed booking</Text>
        <Text style={styles.muted}>Reference: {enquiry.booking.id}</Text>
        <Text style={styles.text}>
          {new Date(enquiry.booking.startsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
          to{' '}
          {new Date(enquiry.booking.endsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
          IST
        </Text>
      </Card>
    );
  if (!accepted.length || ['CONFIRMED', 'CANCELLED', 'CLOSED'].includes(enquiry.status))
    return null;
  const submit = () => {
    setValidation('');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startsDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endsDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endsTime)
    )
      return setValidation('Enter valid dates (YYYY-MM-DD) and times (HH:mm).');
    const start = new Date(`${startsDate}T${startsTime}:00+05:30`),
      end = new Date(`${endsDate}T${endsTime}:00+05:30`);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start >= end ||
      start < new Date()
    )
      return setValidation('Choose a future booking period with the end after the start.');
    if (!spaceId || !quoteId || !confirmed)
      return setValidation(
        'Select the accepted quote, a space, and explicitly confirm the booking.',
      );
    book.mutate({
      spaceId,
      quoteId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      confirmation: true,
    });
  };
  return (
    <Card style={{ borderColor: '#4C6956' }}>
      <Text style={styles.eyebrow}>CUSTOMER ACCEPTED A QUOTATION</Text>
      <Text style={styles.heading}>Confirm the actual booking</Text>
      <Text style={styles.muted}>
        Accepting a quote does not reserve a space. Confirm the agreed venue, time, and quote below
        to create the booking. Existing confirmed reservations are protected against overlap.
      </Text>
      <Text style={styles.label}>Accepted quotation</Text>
      <View style={{ gap: 8 }}>
        {accepted.map((q) => (
          <Chip
            key={q.id}
            label={`${money(q.amountPaise)} · ${q.description.slice(0, 65)}`}
            selected={quoteId === q.id}
            onPress={() => setQuoteId(q.id)}
          />
        ))}
      </View>
      <Text style={styles.label}>Bookable space</Text>
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
      {venue.error ? <Notice tone="error" message={errorMessage(venue.error)} /> : null}
      <Field label="Start date (YYYY-MM-DD)" value={startsDate} onChangeText={setStartsDate} />
      <Field label="Start time (HH:mm, IST)" value={startsTime} onChangeText={setStartsTime} />
      <Field label="End date (YYYY-MM-DD)" value={endsDate} onChangeText={setEndsDate} />
      <Field label="End time (HH:mm, IST)" value={endsTime} onChangeText={setEndsTime} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        onPress={() => setConfirmed((v) => !v)}
        style={styles.row}
      >
        <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={25} color={colors.green} />
        <Text style={[styles.muted, { flex: 1 }]}>
          I confirm this booking with the customer and agree to reserve this space for the selected
          period.
        </Text>
      </Pressable>
      <Button
        title="Create confirmed booking"
        loading={book.isPending}
        disabled={!confirmed}
        onPress={submit}
      />
      {validation ? <Notice tone="error" message={validation} /> : null}
      {book.error ? <Notice tone="error" message={errorMessage(book.error)} /> : null}
    </Card>
  );
}
