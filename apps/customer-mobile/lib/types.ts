export type User = {
  id: string;
  name?: string | null;
  displayName?: string | null;
  phone?: string;
  role: string;
};
export type Location = {
  id?: string;
  name: string;
  state: string;
  latitude?: number;
  longitude?: number;
};
export type VenueMedia = { id: string; url: string; isCover?: boolean; sortOrder?: number };
export type VenueSpace = {
  id: string;
  name: string;
  seatingCapacity: number;
  rentalPricePaise?: number;
  amenities?: string[];
};
export type Venue = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  city: string;
  state: string;
  locality: string;
  pincode: string;
  address: string;
  latitude: number;
  longitude: number;
  seatingCapacity: number;
  diningCapacity: number;
  standingCapacity?: number;
  rentalPricePaise: number;
  amenities: string[];
  eventTypes: string[];
  featured?: boolean;
  verified?: boolean;
  isDemo?: boolean;
  isDevelopment?: boolean;
  media: VenueMedia[];
  spaces?: VenueSpace[];
  phone?: string | null;
  contactPhone?: string | null;
  whatsappPhone?: string | null;
  bookingPolicy?: string | null;
  cancellationPolicy?: string | null;
  restrictions?: string | null;
  halfDayPricePaise?: number | null;
  cateringPricePaise?: number | null;
  decorationPricePaise?: number | null;
  securityDepositPaise?: number | null;
  additionalCharges?: string | null;
  halls?: number;
  guestRooms?: number;
  parkingCapacity?: number;
  policies?: { bookingRules?: string; cancellationRules?: string; restrictions?: string };
};
export type VenuePage = { items: Venue[]; total: number; page: number; limit: number };
export type Quote = {
  id: string;
  amountPaise: number;
  description: string;
  createdAt: string;
  validUntil?: string;
  acceptedAt?: string | null;
};
export type Enquiry = {
  id: string;
  venueId: string;
  venue?: Venue;
  eventDate: string;
  eventType: string;
  guestCount: number;
  status: string;
  requirements?: string;
  budgetPaise?: number;
  quotes?: Quote[];
  messages?: {
    id: string;
    body: string;
    createdAt: string;
    authorId?: string;
    author?: { displayName?: string; role?: string };
  }[];
  siteVisits?: { id: string; startsAt: string; note?: string; status?: string }[];
  createdAt: string;
};
export const categories = [
  { id: 'FUNCTION_HALL', label: 'Function halls', icon: 'business-outline', color: '#BCA1FF' },
  { id: 'CONVENTION_HALL', label: 'Convention halls', icon: 'library-outline', color: '#8FCBB7' },
  { id: 'WEDDING_GARDEN', label: 'Wedding gardens', icon: 'flower-outline', color: '#E5ABBC' },
  { id: 'RESORT', label: 'Resorts', icon: 'sunny-outline', color: '#E7C383' },
  { id: 'BANQUET_HALL', label: 'Banquet halls', icon: 'wine-outline', color: '#9AB8E6' },
  { id: 'FARMHOUSE', label: 'Farmhouses', icon: 'leaf-outline', color: '#9EC892' },
  { id: 'OUTDOOR_VENUE', label: 'Outdoor venues', icon: 'bonfire-outline', color: '#DBA282' },
  { id: 'PARTY_HALL', label: 'Party halls', icon: 'sparkles-outline', color: '#BCA1FF' },
] as const;
export function categoryName(value: string) {
  return categories.find((c) => c.id === value)?.label ?? value.replaceAll('_', ' ').toLowerCase();
}
export function rupees(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
