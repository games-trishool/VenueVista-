import { useRef } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, ui } from '../../lib/theme';
import { request } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import type { Enquiry, Venue } from '../../lib/types';
import {
  Button,
  Chip,
  ErrorState,
  FormField,
  Icon,
  LoginPrompt,
  PageHeader,
} from '../../components/ui';
import { VenueSkeleton } from '../../components/skeleton';
const schema = z.object({
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD, for example 2027-02-20.')
    .refine((value) => {
      const d = new Date(`${value}T00:00:00+05:30`);
      return (
        Number.isFinite(d.getTime()) &&
        d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === value &&
        d.getTime() + 86400000 > Date.now()
      );
    }, 'Choose a valid date today or in the future.'),
  eventType: z.string().min(1, 'Choose an occasion.'),
  guestCount: z
    .string()
    .regex(/^\d+$/, 'Enter the number of guests.')
    .refine(
      (v) => Number(v) > 0 && Number(v) <= 100000,
      'Guest count must be between 1 and 100,000.',
    ),
  budget: z
    .string()
    .refine(
      (v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 20000000),
      'Enter a valid INR budget, up to ₹2 crore.',
    ),
  requirements: z.string().max(2000, 'Keep your message under 2,000 characters.'),
  spaceId: z.string(),
});
type Fields = z.infer<typeof schema>;
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export default function EnquiryForm() {
  const { id, visit } = useLocalSearchParams<{ id: string; visit?: string }>();
  const token = useAppStore((s) => s.token);
  const queryClient = useQueryClient();
  const notify = useAppStore((s) => s.notify);
  const idempotency = useRef(uuid());
  const venue = useQuery({
    queryKey: ['venue', id],
    queryFn: () => request<Venue>(`/venues/${id}`),
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventDate: '',
      eventType: 'WEDDING',
      guestCount: '',
      budget: '',
      requirements: visit
        ? 'I would like to schedule a site visit. Please suggest a convenient date and time.'
        : '',
      spaceId: '',
    },
  });
  const submit = useMutation({
    mutationFn: (data: Fields) =>
      request<Enquiry>('/enquiries', {
        method: 'POST',
        body: {
          venueId: id,
          ...(data.spaceId ? { spaceId: data.spaceId } : {}),
          eventDate: data.eventDate,
          eventType: data.eventType,
          guestCount: Number(data.guestCount),
          ...(data.budget ? { budgetPaise: Math.round(Number(data.budget) * 100) } : {}),
          requirements: data.requirements,
          idempotencyKey: idempotency.current,
        },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      notify('Your enquiry is on its way. The venue can now respond.');
      router.replace(`/enquiries/${data.id}`);
    },
  });
  function input(
    name: 'eventDate' | 'guestCount' | 'budget' | 'requirements',
    label: string,
    placeholder: string,
    numeric = false,
    multiline = false,
  ) {
    return (
      <FormField label={label} error={errors[name]?.message}>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <TextInput
              accessibilityLabel={label}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              keyboardType={numeric ? 'numeric' : 'default'}
              multiline={multiline}
              maxLength={name === 'requirements' ? 2000 : 30}
              style={[ui.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]}
            />
          )}
        />
      </FormField>
    );
  }
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <PageHeader
          title={visit ? 'Come see the possibilities' : 'Let’s make a plan'}
          subtitle="Tell the venue a little about your celebration."
        />
        {!token ? (
          <LoginPrompt description="Sign in before sending an enquiry so the venue can reply to you securely." />
        ) : venue.isPending ? (
          <VenueSkeleton />
        ) : venue.isError ? (
          <ErrorState message={venue.error.message} retry={() => venue.refetch()} />
        ) : (
          <>
            <View
              style={[
                ui.card,
                { flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 27 },
              ]}
            >
              <Icon name="business-outline" color={colors.gold} size={25} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.white, fontWeight: '600', fontSize: 16 }}>
                  {venue.data.name}
                </Text>
                <Text style={[ui.body, { fontSize: 11, marginTop: 3 }]}>
                  {venue.data.city} · An enquiry, not a booking
                </Text>
              </View>
            </View>
            {input('eventDate', 'Your event date', 'YYYY-MM-DD')}
            <FormField label="The occasion" error={errors.eventType?.message}>
              <Controller
                control={control}
                name="eventType"
                render={({ field }) => (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      'WEDDING',
                      'RECEPTION',
                      'ENGAGEMENT',
                      'BIRTHDAY',
                      'ANNIVERSARY',
                      'CORPORATE',
                      'CONFERENCE',
                      'FAMILY_CELEBRATION',
                    ].map((type) => (
                      <Chip
                        key={type}
                        label={type.replaceAll('_', ' ')}
                        selected={field.value === type}
                        onPress={() => field.onChange(type)}
                      />
                    ))}
                  </View>
                )}
              />
            </FormField>
            {input('guestCount', 'Expected guests', 'For example, 300', true)}
            {!!venue.data.spaces?.length && (
              <FormField label="Preferred space">
                <Controller
                  control={control}
                  name="spaceId"
                  render={({ field }) => (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Chip
                        label="Help me choose"
                        selected={!field.value}
                        onPress={() => field.onChange('')}
                      />
                      {venue.data.spaces?.map((s) => (
                        <Chip
                          key={s.id}
                          label={s.name}
                          selected={field.value === s.id}
                          onPress={() => field.onChange(s.id)}
                        />
                      ))}
                    </View>
                  )}
                />
              </FormField>
            )}
            {input(
              'budget',
              'Approximate budget · INR (optional)',
              '₹ Your comfortable budget',
              true,
            )}
            {input(
              'requirements',
              'Anything else on your mind? (optional)',
              'Catering, decoration, accessibility, a site visit...',
              false,
              true,
            )}
            {submit.isError && (
              <Text
                accessibilityRole="alert"
                style={{ color: colors.danger, fontSize: 12, lineHeight: 20, marginBottom: 18 }}
              >
                {submit.error.message}
              </Text>
            )}
            <Button
              label="Send enquiry"
              icon="paper-plane-outline"
              loading={submit.isPending}
              onPress={handleSubmit((data) => submit.mutate(data))}
            />
            <Text style={[ui.body, { fontSize: 11, textAlign: 'center', marginTop: 16 }]}>
              Your request is shared with this venue’s authorized team. The venue will confirm
              availability and send a personalized quote. No payment is collected.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
