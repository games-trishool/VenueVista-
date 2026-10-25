export interface User {
  id: string;
  displayName?: string | null;
  role: 'OWNER' | 'CUSTOMER' | 'ADMIN';
}
export interface Session {
  accessToken: string;
  user: User;
}
export interface Organization {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  status?: string;
  reviewReason?: string | null;
  /** Returned only when registering a business promotes a customer to owner. */
  session?: Session;
}
export interface Media {
  id: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
}
export interface Space {
  id: string;
  name: string;
  seatingCapacity: number;
  diningCapacity?: number;
  rentalPricePaise?: number;
}
export interface Venue {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: string;
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
  status: string;
  rejectionReason?: string | null;
  media: Media[];
  spaces: Space[];
  bookingPolicy?: string;
  cancellationPolicy?: string;
  restrictions?: string;
}
export interface Quote {
  id: string;
  amountPaise: number;
  description: string;
  createdAt: string;
  validUntil?: string;
  acceptedAt?: string | null;
}
export interface SiteVisit {
  id: string;
  startsAt: string;
  note?: string;
}
export interface Enquiry {
  id: string;
  venueId: string;
  spaceId?: string | null;
  venue: Venue;
  eventDate: string;
  eventType: string;
  guestCount: number;
  budgetPaise?: number;
  requirements?: string;
  status: string;
  user?: { displayName?: string };
  booking?: { id: string; startsAt: string; endsAt: string; spaceId: string } | null;
  quotes: Quote[];
  messages: { id: string; body: string; createdAt: string; authorId?: string }[];
  siteVisits: SiteVisit[];
  createdAt: string;
}
export interface Dashboard {
  totalVenues: number;
  activeListings: number;
  pendingApprovals: number;
  newEnquiries: number;
  scheduledSiteVisits: number;
  pendingQuotes: number;
  confirmedBookings: number;
  venueViews: number;
}
