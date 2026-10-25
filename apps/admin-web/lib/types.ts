export interface Overview {
  totalCustomers: number;
  totalOwners: number;
  totalVenues: number;
  pendingApprovals: number;
  activeListings: number;
  totalEnquiries: number;
  confirmedBookings: number;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface VenueMedia {
  id: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
}
export interface VenueSpace {
  id: string;
  name: string;
  seatingCapacity: number;
  diningCapacity?: number;
  standingCapacity?: number;
  rentalPricePaise: number;
}
export interface Venue {
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
  standingCapacity: number;
  rentalPricePaise: number;
  amenities: string[];
  eventTypes: string[];
  media: VenueMedia[];
  spaces: VenueSpace[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: { name: string; status?: string };
  owner?: { id: string; displayName: string; phone?: string };
  policy?: { bookingRules?: string; cancellation?: string; restrictions?: string } | null;
  rejectionReason?: string | null;
}
export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  status: string;
  phone?: string;
  address?: string;
  createdAt: string;
  owner?: { displayName: string; phone: string };
  registrationNumber?: string;
}
export interface User {
  id: string;
  displayName: string;
  phone?: string;
  role: string;
  status?: string;
  createdAt: string;
}
export interface Audit {
  id: string;
  action: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
