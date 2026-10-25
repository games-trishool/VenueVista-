import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage, humanize, money } from '../../src/api';
import { useSession } from '../../src/session';
import { AuthImage } from '../../src/AuthImage';
import type { Media, Organization, Space, Venue } from '../../src/types';
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
} from '../../src/ui';

const categories = [
  'FUNCTION_HALL',
  'CONVENTION_HALL',
  'WEDDING_GARDEN',
  'RESORT',
  'BANQUET_HALL',
  'FARMHOUSE',
  'OUTDOOR_VENUE',
  'PARTY_HALL',
  'CORPORATE_SPACE',
] as const;
const amenitiesList = [
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
  'SWIMMING_POOL',
];
const eventTypes = [
  'WEDDING',
  'RECEPTION',
  'ENGAGEMENT',
  'BIRTHDAY',
  'ANNIVERSARY',
  'CORPORATE',
  'CONFERENCE',
  'FAMILY_CELEBRATION',
];
const steps = [
  'Basics',
  'Location',
  'Spaces',
  'Facilities',
  'Pricing',
  'Photos',
  'Policies',
  'Review',
];
const integer = (minimum: number) =>
  z
    .string()
    .regex(/^\d+$/, 'Enter a whole number.')
    .refine(
      (v) => Number(v) >= minimum && Number(v) <= 100000,
      `Enter a number from ${minimum} to 100,000.`,
    );
const schema = z.object({
  organizationId: z.string().uuid('Select your registered business.'),
  name: z.string().trim().min(3, 'Use at least 3 characters.').max(120),
  description: z
    .string()
    .trim()
    .min(30, 'Describe your venue in at least 30 characters.')
    .max(5000),
  category: z.enum(categories),
  eventTypes: z.array(z.string()).min(1, 'Select at least one event type.'),
  city: z.string().trim().min(2, 'Enter the city.').max(100),
  state: z.string().min(2),
  locality: z.string().trim().min(2, 'Enter the locality.').max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a six-digit PIN code.'),
  address: z.string().trim().min(8, 'Enter the complete street address.').max(500),
  latitude: z
    .string()
    .min(1)
    .refine(
      (v) => Number.isFinite(Number(v)) && Number(v) >= 6 && Number(v) <= 38,
      'Enter a venue latitude within India (6 to 38).',
    ),
  longitude: z
    .string()
    .min(1)
    .refine(
      (v) => Number.isFinite(Number(v)) && Number(v) >= 68 && Number(v) <= 98,
      'Enter a venue longitude within India (68 to 98).',
    ),
  seatingCapacity: integer(1),
  diningCapacity: integer(0),
  standingCapacity: integer(0),
  spaceName: z.string().trim().min(2, 'Name the first independently bookable space.').max(120),
  amenities: z.array(z.string()),
  rentalPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a rental price with at most two decimal places.')
    .refine(
      (v) => Number(v) > 0 && Number(v) <= 20000000,
      'Enter a positive starting rental price.',
    ),
  bookingPolicy: z.string().max(4000),
  cancellationPolicy: z.string().max(4000),
  restrictions: z.string().max(2000),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  organizationId: '',
  name: '',
  description: '',
  category: 'FUNCTION_HALL',
  eventTypes: [],
  city: '',
  state: 'Andhra Pradesh',
  locality: '',
  pincode: '',
  address: '',
  latitude: '',
  longitude: '',
  seatingCapacity: '',
  diningCapacity: '',
  standingCapacity: '0',
  spaceName: '',
  amenities: [],
  rentalPrice: '',
  bookingPolicy: '',
  cancellationPolicy: '',
  restrictions: '',
};
const fieldsByStep: (keyof Values)[][] = [
  ['organizationId', 'name', 'description', 'category', 'eventTypes'],
  ['state', 'city', 'locality', 'pincode', 'address', 'latitude', 'longitude'],
  ['spaceName', 'seatingCapacity', 'diningCapacity', 'standingCapacity'],
  ['amenities'],
  ['rentalPrice'],
  [],
  [],
  [],
];
export default function VenueEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token, hydrated } = useSession();
  const client = useQueryClient();
  const [venueId, setVenueId] = useState(id);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [spaceCapacity, setSpaceCapacity] = useState('');
  const initialized = useRef(false);
  const orgs = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api<Organization[]>('/organizations'),
    enabled: Boolean(token),
  });
  const venue = useQuery({
    queryKey: ['partner-venue', venueId],
    queryFn: () => api<Venue>(`/partner/venues/${venueId}`),
    enabled: Boolean(token && venueId),
  });
  const {
    control,
    getValues,
    watch,
    reset,
    trigger,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = watch();
  useEffect(() => {
    if (!initialized.current && venue.data && id) {
      const v = venue.data;
      reset({
        ...defaults,
        organizationId: v.organizationId,
        name: v.name,
        description: v.description,
        category: v.category as Values['category'],
        city: v.city,
        state: v.state,
        locality: v.locality,
        pincode: v.pincode,
        address: v.address,
        latitude: String(v.latitude),
        longitude: String(v.longitude),
        seatingCapacity: String(v.seatingCapacity),
        diningCapacity: String(v.diningCapacity),
        standingCapacity: String(v.standingCapacity || 0),
        rentalPrice: String(v.rentalPricePaise / 100),
        amenities: v.amenities || [],
        eventTypes: v.eventTypes || [],
        spaceName: v.spaces?.[0]?.name || 'Main hall',
        bookingPolicy: v.bookingPolicy || '',
        cancellationPolicy: v.cancellationPolicy || '',
        restrictions: v.restrictions || '',
      });
      initialized.current = true;
    }
  }, [venue.data, id, reset]);
  useEffect(() => {
    if (!id && !getValues('organizationId') && orgs.data?.length === 1)
      setValue('organizationId', orgs.data[0].id);
  }, [orgs.data, id, getValues, setValue]);
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['partner-venue', venueId] });
    void client.invalidateQueries({ queryKey: ['partner-venues'] });
    void client.invalidateQueries({ queryKey: ['partner-dashboard'] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(getValues());
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          setError(issue.path[0] as keyof Values, { message: issue.message });
        const field = parsed.error.issues[0]?.path[0] as keyof Values;
        const target = fieldsByStep.findIndex((fields) => fields.includes(field));
        if (target >= 0) setStep(target);
        throw new Error(
          'Complete the required business, location, capacity, and pricing information before saving your draft.',
        );
      }
      const v = parsed.data;
      const body = {
        organizationId: v.organizationId,
        name: v.name,
        description: v.description,
        category: v.category,
        eventTypes: v.eventTypes,
        city: v.city,
        state: v.state,
        locality: v.locality,
        pincode: v.pincode,
        address: v.address,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        seatingCapacity: Number(v.seatingCapacity),
        diningCapacity: Number(v.diningCapacity),
        standingCapacity: Number(v.standingCapacity),
        amenities: v.amenities,
        rentalPricePaise: Math.round(Number(v.rentalPrice) * 100),
        ...(v.bookingPolicy.trim() ? { bookingPolicy: v.bookingPolicy.trim() } : {}),
        ...(v.cancellationPolicy.trim() ? { cancellationPolicy: v.cancellationPolicy.trim() } : {}),
        ...(v.restrictions.trim() ? { restrictions: v.restrictions.trim() } : {}),
        ...(!venueId
          ? {
              spaces: [
                {
                  name: v.spaceName,
                  seatingCapacity: Number(v.seatingCapacity),
                  diningCapacity: Number(v.diningCapacity),
                  rentalPricePaise: Math.round(Number(v.rentalPrice) * 100),
                  amenities: v.amenities,
                },
              ],
            }
          : {}),
      };
      return api<Venue>(venueId ? `/partner/venues/${venueId}` : '/partner/venues', {
        method: venueId ? 'PATCH' : 'POST',
        body,
      });
    },
    onSuccess: (v) => {
      setVenueId(v.id);
      setNotice('Your draft is saved securely. Add photographs before submitting it for approval.');
      client.setQueryData(['partner-venue', v.id], v);
      void client.invalidateQueries({ queryKey: ['partner-venues'] });
      void client.invalidateQueries({ queryKey: ['partner-dashboard'] });
    },
  });
  const submit = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return api<Venue>(`/partner/venues/${venueId}/submit`, { method: 'POST', body: {} });
    },
    onSuccess: () => {
      setNotice(
        'Submitted for review. Your listing will appear in customer search only after approval.',
      );
      invalidate();
    },
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!venueId) throw new Error('Save your draft first, then upload photographs.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return undefined;
      const photo = result.assets[0];
      if (photo.fileSize && photo.fileSize > 8 * 1024 * 1024)
        throw new Error('Choose a photo smaller than 8 MB.');
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(photo.uri)).blob();
        form.append('file', blob, photo.fileName || 'venue.jpg');
      } else
        form.append('file', {
          uri: photo.uri,
          name: photo.fileName || 'venue.jpg',
          type: photo.mimeType || 'image/jpeg',
        } as unknown as Blob);
      return api<Media>(`/partner/venues/${venueId}/media`, { method: 'POST', form });
    },
    onSuccess: (photo) => {
      if (photo) {
        setMediaError('');
        invalidate();
      }
    },
    onError: (e) => setMediaError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (mediaId: string) =>
      api(`/partner/venues/${venueId}/media/${mediaId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const addSpace = useMutation({
    mutationFn: () => {
      if (!spaceName.trim() || !/^\d+$/.test(spaceCapacity) || Number(spaceCapacity) < 1)
        throw new Error('Enter a space name and a positive seating capacity.');
      return api<Space>(`/partner/venues/${venueId}/spaces`, {
        method: 'POST',
        body: { name: spaceName.trim(), seatingCapacity: Number(spaceCapacity) },
      });
    },
    onSuccess: () => {
      setSpaceName('');
      setSpaceCapacity('');
      invalidate();
    },
  });
  const next = async () => {
    setNotice('');
    if (!(await trigger(fieldsByStep[step]))) return;
    if (step === 4) {
      try {
        await save.mutateAsync();
      } catch {
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 7));
  };
  const field = (
    name: keyof Values,
    label: string,
    extra: {
      multiline?: boolean;
      keyboardType?: 'numeric' | 'decimal-pad';
      placeholder?: string;
    } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <Field
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...extra}
        />
      )}
    />
  );
  const toggle = (name: 'amenities' | 'eventTypes', item: string) =>
    setValue(
      name,
      values[name].includes(item)
        ? values[name].filter((x) => x !== item)
        : [...values[name], item],
      { shouldValidate: true },
    );
  if (hydrated && !token) return <Redirect href="/sign-in" />;
  if (id && venue.isLoading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (id && venue.error)
    return (
      <Screen>
        <ErrorState error={venue.error} retry={() => void venue.refetch()} />
      </Screen>
    );
  const media = venue.data?.media || [];
  const status = venue.data?.status;
  return (
    <Screen>
      <View style={{ gap: 9 }}>
        <Text style={styles.eyebrow}>
          {venueId ? 'LISTING WORKSPACE' : 'CREATE SOMETHING MEMORABLE'}
        </Text>
        <View style={styles.spread}>
          <Text style={[styles.title, { flex: 1 }]}>{values.name || 'Your next great venue'}</Text>
          {status ? <Badge status={status} /> : null}
        </View>
        <Text style={styles.muted}>
          Step {step + 1} of 8 · {steps[step]}
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 3, backgroundColor: colors.border }}>
        <View
          style={{
            width: `${((step + 1) / 8) * 100}%`,
            height: 4,
            backgroundColor: colors.purple,
            borderRadius: 3,
          }}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {steps.map((title, i) => (
          <Chip
            key={title}
            label={`${i + 1}. ${title}`}
            selected={i === step}
            onPress={() => setStep(i)}
          />
        ))}
      </ScrollView>
      {status === 'APPROVED' ? (
        <Notice message="Saving changes moves an approved listing back to draft and hides it from customer search until it is reviewed again." />
      ) : null}
      {venue.data?.rejectionReason ? (
        <Notice tone="error" message={`Review feedback: ${venue.data.rejectionReason}`} />
      ) : null}
      <Card>
        {step === 0 ? (
          <>
            <Text style={styles.heading}>First, a proper introduction.</Text>
            {orgs.isLoading ? (
              <Loading />
            ) : orgs.error ? (
              <ErrorState error={orgs.error} retry={() => void orgs.refetch()} />
            ) : !orgs.data?.length ? (
              <>
                <Notice message="Register your business before creating a venue." />
                <Button
                  title="Register a business"
                  variant="secondary"
                  onPress={() => router.push('/account')}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Business organization</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {orgs.data.map((o) => (
                    <Chip
                      key={o.id}
                      label={o.name}
                      selected={values.organizationId === o.id}
                      onPress={() => setValue('organizationId', o.id, { shouldValidate: true })}
                    />
                  ))}
                </View>
                {errors.organizationId ? (
                  <Notice
                    tone="error"
                    message={errors.organizationId.message || 'Select a business.'}
                  />
                ) : null}
              </>
            )}
            {field('name', 'Venue name', { placeholder: 'Your venue’s official name' })}
            {field('description', 'Tell customers about your space', {
              multiline: true,
              placeholder: 'Describe what makes your venue special, in your own words…',
            })}
            <Text style={styles.label}>Venue category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={humanize(c)}
                  selected={values.category === c}
                  onPress={() => setValue('category', c)}
                />
              ))}
            </View>
            <Text style={styles.label}>Supported celebrations</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {eventTypes.map((e) => (
                <Chip
                  key={e}
                  label={humanize(e)}
                  selected={values.eventTypes.includes(e)}
                  onPress={() => toggle('eventTypes', e)}
                />
              ))}
            </View>
            {errors.eventTypes ? (
              <Notice tone="error" message={errors.eventTypes.message || 'Choose an event type.'} />
            ) : null}
          </>
        ) : step === 1 ? (
          <>
            <Text style={styles.heading}>Put your venue on the map.</Text>
            <Text style={styles.label}>State</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Andhra Pradesh', 'Telangana'].map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={values.state === s}
                  onPress={() => setValue('state', s)}
                />
              ))}
            </View>
            {field('city', 'City')}
            {field('locality', 'Locality / neighbourhood')}
            {field('pincode', 'PIN code', { keyboardType: 'numeric' })}
            {field('address', 'Full address', { multiline: true })}
            <Notice message="Use the actual location of your venue. Coordinates power city and nearby discovery; do not use a city centre as a substitute." />
            {field('latitude', 'Latitude', {
              keyboardType: 'decimal-pad',
              placeholder: 'For example, 17.72',
            })}
            {field('longitude', 'Longitude', {
              keyboardType: 'decimal-pad',
              placeholder: 'For example, 83.30',
            })}
          </>
        ) : step === 2 ? (
          <>
            <Text style={styles.heading}>Room for every guest.</Text>
            {!id
              ? field('spaceName', 'First independently bookable space', {
                  placeholder: 'For example, Main hall',
                })
              : null}
            {field('seatingCapacity', 'Venue seating capacity', { keyboardType: 'numeric' })}
            {field('diningCapacity', 'Dining capacity', { keyboardType: 'numeric' })}
            {field('standingCapacity', 'Standing capacity', { keyboardType: 'numeric' })}
            <Notice message="Capacity is the maximum number of guests your venue can safely accommodate. Each space has its own booking calendar." />
            {venueId ? (
              <>
                <Button
                  title="Manage availability calendar"
                  variant="secondary"
                  icon="calendar-outline"
                  onPress={() =>
                    router.push({ pathname: '/availability', params: { id: venueId } })
                  }
                />
                <Text style={styles.heading}>Your bookable spaces</Text>
                {venue.data?.spaces?.map((s) => (
                  <View key={s.id} style={styles.spread}>
                    <Text style={styles.text}>{s.name}</Text>
                    <Text style={styles.muted}>{s.seatingCapacity} seats</Text>
                  </View>
                ))}
                <Field
                  label="Add another space"
                  value={spaceName}
                  onChangeText={setSpaceName}
                  placeholder="Mini hall, wedding lawn…"
                />
                <Field
                  label="Seating capacity for new space"
                  value={spaceCapacity}
                  onChangeText={setSpaceCapacity}
                  keyboardType="numeric"
                />
                <Button
                  title="Add bookable space"
                  variant="secondary"
                  onPress={() => addSpace.mutate()}
                  loading={addSpace.isPending}
                />
                {addSpace.error ? (
                  <Notice tone="error" message={errorMessage(addSpace.error)} />
                ) : null}
              </>
            ) : null}
          </>
        ) : step === 3 ? (
          <>
            <Text style={styles.heading}>The details make a difference.</Text>
            <Text style={styles.muted}>
              Only select facilities that are available at this venue.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {amenitiesList.map((a) => (
                <Chip
                  key={a}
                  label={humanize(a)}
                  selected={values.amenities.includes(a)}
                  onPress={() => toggle('amenities', a)}
                />
              ))}
            </View>
          </>
        ) : step === 4 ? (
          <>
            <Text style={styles.heading}>Start with transparent pricing.</Text>
            {field('rentalPrice', 'Starting full-day rental (INR)', {
              keyboardType: 'decimal-pad',
              placeholder: 'Enter your actual starting rental',
            })}
            <Notice message="This is a starting rental price, not a guaranteed final booking amount. Send an itemized quotation for each enquiry. Amounts are stored as integer paise in INR." />
            <Notice message="Next saves the required listing information as a draft so you can securely upload photographs." />
          </>
        ) : step === 5 ? (
          <>
            <Text style={styles.heading}>Let your space do the talking.</Text>
            <Text style={styles.muted}>
              Upload original venue photographs. JPEG, PNG, or WebP · up to 8 MB each. The first
              photo becomes the cover image.
            </Text>
            {!venueId ? (
              <Button
                title="Save draft to enable uploads"
                onPress={() => save.mutate()}
                loading={save.isPending}
              />
            ) : (
              <Button
                title="Choose and upload a photograph"
                icon="images-outline"
                onPress={() => upload.mutate()}
                loading={upload.isPending}
              />
            )}
            {mediaError ? <Notice tone="error" message={mediaError} /> : null}
            {remove.error ? <Notice tone="error" message={errorMessage(remove.error)} /> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {media.map((m) => (
                <View key={m.id} style={{ flexBasis: '46%', flexGrow: 1, gap: 8 }}>
                  <AuthImage
                    label={m.isCover ? 'Venue cover photo' : 'Venue gallery photo'}
                    url={m.url}
                    style={{ width: '100%', height: 160, borderRadius: 12 }}
                  />
                  <View style={styles.spread}>
                    <Text style={styles.muted}>{m.isCover ? 'Cover photo' : 'Gallery photo'}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      disabled={remove.isPending}
                      onPress={() => remove.mutate(m.id)}
                      style={{ padding: 9 }}
                    >
                      <Ionicons name="trash-outline" color={colors.red} size={19} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            {!media.length ? (
              <Notice message="A venue needs at least one actual photograph before you can submit it for review." />
            ) : null}
          </>
        ) : step === 6 ? (
          <>
            <Text style={styles.heading}>Set clear expectations.</Text>
            {field('bookingPolicy', 'Booking rules', {
              multiline: true,
              placeholder: 'Rental duration, advance payment, inclusions, and conditions…',
            })}
            {field('cancellationPolicy', 'Cancellation and refund rules', {
              multiline: true,
              placeholder: 'State your actual cancellation policy…',
            })}
            {field('restrictions', 'Venue restrictions', {
              multiline: true,
              placeholder: 'Music timing, outside catering, alcohol, and other restrictions…',
            })}
          </>
        ) : (
          <>
            <Text style={styles.heading}>Ready for its first impression?</Text>
            <Text style={[styles.title, { fontSize: 24 }]}>{values.name || 'Your venue'}</Text>
            <Text style={styles.muted}>
              {humanize(values.category)} · {values.city}, {values.state}
            </Text>
            <Text style={styles.text}>{values.description}</Text>
            <Text style={styles.muted}>
              {values.address} · {values.pincode}
            </Text>
            <Text style={styles.text}>
              {values.seatingCapacity || '—'} seated · {values.diningCapacity || '—'} dining
            </Text>
            <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 20 }}>
              {values.rentalPrice
                ? money(Math.round(Number(values.rentalPrice) * 100))
                : 'Add pricing'}{' '}
              <Text style={{ fontSize: 12, fontWeight: '400' }}>starting rental</Text>
            </Text>
            <Text style={styles.muted}>
              {media.length} photographs · {values.amenities.length} facilities
            </Text>
            <Notice message="An administrator reviews each listing before it appears in customer search. A draft or pending listing is never shown publicly." />
            <Button
              title="Submit listing for approval"
              icon="checkmark-circle-outline"
              loading={submit.isPending || save.isPending}
              disabled={
                !venueId || media.length === 0 || status === 'PENDING' || status === 'APPROVED'
              }
              onPress={() => submit.mutate()}
            />
            {submit.error ? <Notice tone="error" message={errorMessage(submit.error)} /> : null}
            {status === 'PENDING' ? (
              <Notice
                tone="success"
                message="Your listing is in the review queue. We’ll notify you in the app when it is reviewed."
              />
            ) : null}
          </>
        )}
        {save.error ? <Notice tone="error" message={errorMessage(save.error)} /> : null}
        {notice ? <Notice tone="success" message={notice} /> : null}
      </Card>
      <View style={styles.spread}>
        {step > 0 ? (
          <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
        ) : (
          <View />
        )}
        {step < 7 ? (
          <Button
            title={step === 4 ? 'Save & continue' : 'Continue'}
            loading={save.isPending}
            onPress={() => void next()}
          />
        ) : (
          <Button
            title="Back to venues"
            variant="secondary"
            onPress={() => router.replace('/venues')}
          />
        )}
      </View>
      {step >= 4 ? (
        <Button
          title="Save draft"
          variant="secondary"
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      ) : null}
    </Screen>
  );
}
