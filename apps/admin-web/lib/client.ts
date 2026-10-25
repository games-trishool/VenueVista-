'use client';

export async function adminRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(`/api/backend/admin/${path}`, {
    method: options?.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options?.signal,
    cache: 'no-store',
  });
  if (response.status === 401) {
    window.location.assign('/login?session=expired');
    throw new Error('Your session has expired.');
  }
  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message ?? data.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(', ')
        : message || `Request failed (${response.status}).`,
    );
  }
  return data as T;
}

export const formatMoney = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
