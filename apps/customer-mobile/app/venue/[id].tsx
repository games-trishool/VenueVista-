import { useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, serif, ui } from '../../lib/theme';
import { request } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { categoryName, rupees, type Venue } from '../../lib/types';
import {
  Button,
  Chip,
  Divider,
  ErrorState,
  Icon,
  PageHeader,
  SectionTitle,
} from '../../components/ui';
import { VenueSkeleton } from '../../components/skeleton';
import { CelebrationArch } from '../../components/celebration-arch';
type Availability = {
  entries: { date: string; status: string; spaceId?: string; note?: string }[];
  bookings: { spaceId: string; startsAt: string; endsAt: string }[];
  defaultStatus: string;
};
export default function VenueDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAppStore((s) => s.token);
  const notify = useAppStore((s) => s.notify);
  const comparison = useAppStore((s) => s.comparison);
  const toggleComparison = useAppStore((s) => s.toggleComparison);
  const [gallery, setGallery] = useState<number | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const queryClient = useQueryClient();
  const venue = useQuery({
    queryKey: ['venue', id],
    queryFn: ({ signal }) => request<Venue>(`/venues/${id}`, { signal }),
  });
  const wishlist = useQuery({
    queryKey: ['wishlist', token],
    queryFn: () => request<Venue[]>('/wishlist'),
    enabled: !!token,
  });
  const saved = wishlist.data?.some((v) => v.id === id) ?? false;
  const save = useMutation({
    mutationFn: () => request(`/wishlist/${id}`, { method: saved ? 'DELETE' : 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      notify(saved ? 'Venue removed from your wishlist.' : 'Saved for a future celebration.');
    },
    onError: (e: Error) => notify(e.message),
  });
  const availability = useQuery({
    queryKey: ['availability', id, month],
    queryFn: () => request<Availability>(`/venues/${id}/availability?month=${month}`),
    enabled: showAvailability,
  });
  const v = venue.data;
  const media = [...(v?.media ?? [])].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const enquire = (visit?: boolean) => {
    if (!token) router.push('/profile');
    else
      router.push({
        pathname: '/enquiry/[id]',
        params: { id, ...(visit ? { visit: 'true' } : {}) },
      });
  };
  const maps = () => {
    if (v)
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`,
      ).catch(() => notify('Couldn’t open maps. Please try again.'));
  };
  const phone = v?.contactPhone ?? v?.phone;
  function advanceMonth(increment: number) {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(year, m - 1 + increment, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="The setting for your story"
          subtitle="Take a closer look."
          right={
            v ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share venue"
                onPress={() =>
                  Share.share({
                    message: `${v.name} in ${v.city} · Starting rental ${rupees(v.rentalPricePaise)}. Explore on VenueVista: venuevista://venue/${v.id}`,
                  }).catch(() => notify('Sharing is not available on this device.'))
                }
              >
                <Icon name="share-social-outline" color={colors.white} />
              </Pressable>
            ) : undefined
          }
        />
        {venue.isPending ? (
          <VenueSkeleton />
        ) : venue.isError ? (
          <ErrorState message={venue.error.message} retry={() => venue.refetch()} />
        ) : (
          v && (
            <>
              {media.length ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 22 }}
                >
                  {media.map((image, i) => (
                    <Pressable
                      accessibilityRole="button"
                      key={image.id}
                      accessibilityLabel={`Open photograph ${i + 1}`}
                      onPress={() => setGallery(i)}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={{
                          width: Math.min(Dimensions.get('window').width - 48, 952),
                          height: 290,
                        }}
                        resizeMode="cover"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          right: 16,
                          backgroundColor: '#111015BB',
                          borderRadius: 10,
                          padding: 8,
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 11 }}>
                          {i + 1} / {media.length} · Tap to expand
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#22192D',
                    borderRadius: 24,
                    padding: 10,
                    marginBottom: 22,
                  }}
                >
                  <CelebrationArch size={200} />
                  <Text style={[ui.body, { fontSize: 11, paddingBottom: 15 }]}>
                    No venue photographs available yet.
                  </Text>
                </View>
              )}
              <View
                style={[ui.row, { justifyContent: 'space-between', gap: 10, marginBottom: 12 }]}
              >
                <Chip label={categoryName(v.category)} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  onPress={() => (!token ? router.push('/profile') : save.mutate())}
                  style={{ padding: 9 }}
                >
                  <Icon
                    name={saved ? 'heart' : 'heart-outline'}
                    size={25}
                    color={saved ? '#E5ABBC' : colors.white}
                  />
                </Pressable>
              </View>
              {(v.isDemo || v.isDevelopment) && (
                <Text style={{ color: colors.gold, fontSize: 11, marginBottom: 10 }}>
                  DEVELOPMENT LISTING · NOT A REAL BOOKABLE VENUE
                </Text>
              )}
              <Text
                style={{
                  fontSize: 35,
                  lineHeight: 41,
                  fontFamily: serif,
                  color: colors.white,
                  letterSpacing: -0.5,
                }}
              >
                {v.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={maps}
                style={[ui.row, { gap: 6, marginTop: 13, alignSelf: 'flex-start' }]}
              >
                <Icon name="location-outline" color={colors.gold} size={16} />
                <Text style={{ color: colors.gold, fontSize: 12 }}>
                  {v.locality ? `${v.locality}, ` : ''}
                  {v.city}
                </Text>
                <Icon name="arrow-up-right-box-outline" color={colors.gold} size={13} />
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 23, gap: 10 }}>
                {[
                  { label: 'Seating', value: v.seatingCapacity },
                  { label: 'Dining', value: v.diningCapacity },
                  ...(v.standingCapacity ? [{ label: 'Standing', value: v.standingCapacity }] : []),
                ].map((s) => (
                  <View
                    key={s.label}
                    style={{
                      flexGrow: 1,
                      minWidth: 90,
                      backgroundColor: colors.surface,
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 23, fontWeight: '600' }}>
                      {s.value}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
                      {s.label} guests
                    </Text>
                  </View>
                ))}
              </View>
              <Divider />
              <SectionTitle title="A place to make it yours" />
              <Text style={ui.body}>{v.description}</Text>
              {!!v.eventTypes?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                  {v.eventTypes.map((e) => (
                    <Chip key={e} label={e.replaceAll('_', ' ')} />
                  ))}
                </View>
              )}
              <Divider />
              <SectionTitle title="The thoughtful extras" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {v.amenities?.length ? (
                  v.amenities.map((a) => (
                    <View key={a} style={[ui.row, { gap: 8, minWidth: '44%', paddingVertical: 9 }]}>
                      <Icon name="checkmark-circle-outline" color={colors.accent} size={17} />
                      <Text style={{ color: '#D4CCD9', fontSize: 12 }}>
                        {a.replaceAll('_', ' ')}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={ui.body}>Ask the venue about facilities in your enquiry.</Text>
                )}
              </View>
              <Divider />
              <SectionTitle title="A little clarity on price" />
              <View style={[ui.card, { borderColor: '#5E4B37' }]}>
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 1.4,
                  }}
                >
                  STARTING RENTAL · INR
                </Text>
                <Text
                  style={{ color: colors.white, fontSize: 33, fontFamily: serif, marginTop: 9 }}
                >
                  {rupees(v.rentalPricePaise)}
                </Text>
                <Text style={[ui.body, { fontSize: 12, marginTop: 10 }]}>
                  An indicative starting price, not a final booking price. Catering, decoration,
                  taxes, deposits and extras may apply. Request a personalized quotation.
                </Text>
              </View>
              {[
                { label: 'Half-day rental', value: v.halfDayPricePaise },
                { label: 'Catering · per plate', value: v.cateringPricePaise },
                { label: 'Decoration', value: v.decorationPricePaise },
                { label: 'Security deposit', value: v.securityDepositPaise },
              ]
                .filter((item) => item.value !== undefined && item.value !== null)
                .map((item) => (
                  <View
                    key={item.label}
                    style={[ui.row, { justifyContent: 'space-between', paddingTop: 17 }]}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{item.label}</Text>
                    <Text style={{ color: colors.white, fontSize: 13 }}>{rupees(item.value!)}</Text>
                  </View>
                ))}
              {v.additionalCharges && (
                <Text style={[ui.body, { fontSize: 11, marginTop: 14 }]}>
                  Additional charges: {v.additionalCharges}
                </Text>
              )}
              {!!v.spaces?.length && (
                <>
                  <Divider />
                  <SectionTitle
                    title="Find your perfect fit"
                    detail="Explore the spaces within this venue."
                  />
                  {v.spaces.map((space) => (
                    <View key={space.id} style={[ui.card, { marginBottom: 12 }]}>
                      <Text style={{ color: colors.white, fontSize: 17, fontWeight: '600' }}>
                        {space.name}
                      </Text>
                      <Text style={[ui.body, { fontSize: 12, marginTop: 7 }]}>
                        {space.seatingCapacity} seated guests
                        {space.rentalPricePaise ? ` · From ${rupees(space.rentalPricePaise)}` : ''}
                      </Text>
                    </View>
                  ))}
                </>
              )}
              <Divider />
              <SectionTitle
                title="When shall we celebrate?"
                detail="Only owner-provided dates are marked available."
              />
              <Button
                label={showAvailability ? 'Hide calendar' : 'Check availability'}
                secondary
                icon="calendar-outline"
                onPress={() => setShowAvailability(!showAvailability)}
              />
              {showAvailability && (
                <View style={[ui.card, { marginTop: 16 }]}>
                  <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Previous month"
                      onPress={() => advanceMonth(-1)}
                    >
                      <Icon name="chevron-back" />
                    </Pressable>
                    <Text style={{ color: colors.white }}>
                      {new Date(`${month}-15T12:00:00`).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Next month"
                      onPress={() => advanceMonth(1)}
                    >
                      <Icon name="chevron-forward" />
                    </Pressable>
                  </View>
                  {availability.isError ? (
                    <Text style={{ color: colors.danger, fontSize: 12 }}>
                      {availability.error.message}
                    </Text>
                  ) : availability.isPending ? (
                    <Text style={ui.body}>Loading availability...</Text>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                        {Array.from(
                          {
                            length: new Date(
                              Number(month.slice(0, 4)),
                              Number(month.slice(5, 7)),
                              0,
                            ).getDate(),
                          },
                          (_, index) => {
                            const date = `${month}-${String(index + 1).padStart(2, '0')}`;
                            const entries = availability.data.entries.filter(
                              (e) => e.date.slice(0, 10) === date,
                            );
                            const dayStart = new Date(`${date}T00:00:00+05:30`).getTime();
                            const booked = availability.data.bookings.some(
                              (b) =>
                                new Date(b.startsAt).getTime() < dayStart + 86400000 &&
                                new Date(b.endsAt).getTime() > dayStart,
                            );
                            const status =
                              booked || entries.some((e) => e.status === 'UNAVAILABLE')
                                ? 'UNAVAILABLE'
                                : entries.some((e) => e.status === 'TENTATIVE')
                                  ? 'TENTATIVE'
                                  : entries.length && entries.every((e) => e.status === 'AVAILABLE')
                                    ? 'AVAILABLE'
                                    : 'NOT_CONFIRMED';
                            const color =
                              status === 'AVAILABLE'
                                ? colors.success
                                : status === 'UNAVAILABLE'
                                  ? colors.danger
                                  : status === 'TENTATIVE'
                                    ? colors.gold
                                    : colors.muted;
                            return (
                              <View
                                key={date}
                                accessibilityLabel={`${date}: ${status.replaceAll('_', ' ')}`}
                                style={{
                                  width: 33,
                                  height: 38,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: `${color}12`,
                                  borderRadius: 8,
                                  borderColor: `${color}40`,
                                  borderWidth: 1,
                                }}
                              >
                                <Text style={{ color, fontSize: 11 }}>{index + 1}</Text>
                              </View>
                            );
                          },
                        )}
                      </View>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 }}
                      >
                        {[
                          { label: 'Available', color: colors.success },
                          { label: 'Unavailable', color: colors.danger },
                          { label: 'Tentative', color: colors.gold },
                          { label: 'Not confirmed', color: colors.muted },
                        ].map((s) => (
                          <Text key={s.label} style={{ color: s.color, fontSize: 9 }}>
                            ● {s.label}
                          </Text>
                        ))}
                      </View>
                      <Text style={[ui.body, { fontSize: 11, marginTop: 14 }]}>
                        A blocked date may apply to one space rather than the entire venue.
                        Availability can change. Send an enquiry to confirm your preferred date.
                      </Text>
                    </>
                  )}
                </View>
              )}
              <Divider />
              <SectionTitle title="Come take a look" />
              <Text style={ui.body}>
                {v.address}
                {'\n'}
                {v.locality}, {v.city}, {v.state} {v.pincode}
              </Text>
              <View style={{ marginTop: 15 }}>
                <Button label="Get directions" secondary icon="navigate-outline" onPress={maps} />
              </View>
              {phone && (
                <View style={[ui.row, { gap: 12, marginTop: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Call venue"
                      secondary
                      icon="call-outline"
                      onPress={() =>
                        Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`).catch(() =>
                          notify('Calling is unavailable on this device.'),
                        )
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="WhatsApp"
                      secondary
                      icon="logo-whatsapp"
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/${(v.whatsappPhone ?? phone).replace(/\D/g, '')}`,
                        ).catch(() => notify('Couldn’t open WhatsApp.'))
                      }
                    />
                  </View>
                </View>
              )}
              {(v.bookingPolicy || v.cancellationPolicy || v.restrictions) && (
                <>
                  <Divider />
                  <SectionTitle title="Before you say yes" />
                  {[
                    { label: 'Booking policy', value: v.bookingPolicy },
                    { label: 'Cancellation policy', value: v.cancellationPolicy },
                    { label: 'Restrictions', value: v.restrictions },
                  ]
                    .filter((item) => !!item.value)
                    .map((item) => (
                      <View key={item.label} style={{ marginBottom: 14 }}>
                        <Text style={{ color: colors.gold, fontSize: 11, marginBottom: 7 }}>
                          {item.label}
                        </Text>
                        <Text style={ui.body}>{item.value}</Text>
                      </View>
                    ))}
                </>
              )}
              <Divider />
              <Button
                label="Request a personalized quote"
                icon="chatbubble-ellipses-outline"
                onPress={() => enquire()}
              />
              <View style={{ marginTop: 12 }}>
                <Button
                  label="Request a site visit"
                  secondary
                  icon="calendar-outline"
                  onPress={() => enquire(true)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toggleComparison(v.id);
                }}
                style={[ui.row, { gap: 8, justifyContent: 'center', padding: 17 }]}
              >
                <Icon name="git-compare-outline" size={17} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: 12 }}>
                  {comparison.includes(v.id) ? 'Remove from comparison' : 'Add to comparison'}
                </Text>
              </Pressable>
              {comparison.length > 0 && (
                <Button
                  label={`Compare saved venues (${comparison.length})`}
                  secondary
                  onPress={() => router.push('/compare')}
                />
              )}
              <Text style={[ui.body, { fontSize: 10, marginTop: 20, textAlign: 'center' }]}>
                An enquiry is not a confirmed booking. No payment is taken in VenueVista.
              </Text>
            </>
          )
        )}
      </ScrollView>
      <Modal visible={gallery !== null} transparent onRequestClose={() => setGallery(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#09080CED' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photograph viewer"
            onPress={() => setGallery(null)}
            style={{ padding: 24, alignSelf: 'flex-end' }}
          >
            <Icon name="close" size={27} color={colors.white} />
          </Pressable>
          {gallery !== null && media[gallery] && (
            <>
              <Image
                source={{ uri: media[gallery].url }}
                style={{ flex: 1, width: '100%' }}
                resizeMode="contain"
              />
              <View style={[ui.row, { justifyContent: 'space-around', padding: 25 }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous photograph"
                  onPress={() => setGallery((gallery - 1 + media.length) % media.length)}
                >
                  <Icon name="chevron-back" size={25} color={colors.white} />
                </Pressable>
                <Text style={{ color: colors.white }}>
                  {gallery + 1} / {media.length}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next photograph"
                  onPress={() => setGallery((gallery + 1) % media.length)}
                >
                  <Icon name="chevron-forward" size={25} color={colors.white} />
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
