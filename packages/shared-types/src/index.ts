/** All monetary amounts are integer INR paise. Dates are ISO dates; timestamps UTC ISO-8601. */
export type Role = 'CUSTOMER' | 'OWNER' | 'ADMIN';
export type VenueStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type EnquiryStatus =
  | 'NEW'
  | 'VIEWED'
  | 'RESPONDED'
  | 'QUOTE_SENT'
  | 'SITE_VISIT_SCHEDULED'
  | 'NEGOTIATING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CLOSED';
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface SessionUser {
  id: string;
  displayName: string | null;
  phone: string | null;
  role: Role;
  isDevelopment: boolean;
}
export interface Session {
  accessToken: string;
  user: SessionUser;
}
export interface ApiError {
  statusCode: number;
  error: { message: string; details?: { path: string; message: string }[] };
  requestId?: string;
  path?: string;
}
export interface Location {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}
export const formatINR = (paise: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
