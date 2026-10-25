import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const sessionCookie = 'venuevista_admin';
export const apiUrl = () =>
  (process.env.API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
export const developmentAuth = () =>
  process.env.NODE_ENV !== 'production' && process.env.ADMIN_ENABLE_DEV_AUTH === 'true';

export async function getSession() {
  return (await cookies()).get(sessionCookie)?.value;
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const source = new URL(origin);
    if (source.origin !== origin || !['http:', 'https:'].includes(source.protocol)) return false;
    // Next's internal URL can use the bind address (e.g. 0.0.0.0), while the
    // browser correctly sends localhost as its Origin. Host is the requested
    // authority; do not trust client-supplied X-Forwarded-Host/Proto headers.
    // Production deployments pin the external HTTPS origin explicitly.
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_ORIGIN) return false;
    const target = process.env.ADMIN_ORIGIN
      ? new URL(process.env.ADMIN_ORIGIN)
      : new URL(
          `${request.nextUrl.protocol}//${request.headers.get('host') || request.nextUrl.host}`,
        );
    if (process.env.NODE_ENV === 'production' && target.protocol !== 'https:') return false;
    return source.origin === target.origin;
  } catch {
    return false;
  }
}

export async function backend(path: string, token?: string, init: RequestInit = {}) {
  return fetch(`${apiUrl()}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
}

export function unavailable() {
  return NextResponse.json(
    { message: 'The platform API could not be reached. Please try again.' },
    { status: 503 },
  );
}

export interface AdminUser {
  id: string;
  displayName: string | null;
  role: string;
  phone?: string | null;
}

export async function currentAdmin(token: string): Promise<AdminUser | null> {
  try {
    const response = await backend('me', token);
    if (!response.ok) return null;
    const user = (await response.json()) as AdminUser;
    return user.role === 'ADMIN' ? user : null;
  } catch {
    return null;
  }
}
