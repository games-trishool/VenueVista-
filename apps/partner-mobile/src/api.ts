import { useSession } from './session';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(
  /\/$/,
  '',
);
export const DEV_AUTH = process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH === 'true';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const token = useSession.getState().token;
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      signal: controller.signal,
      headers: {
        ...(options.form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.form || (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });
    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      let message =
        data?.message || data?.error?.message || `The request failed (${response.status}).`;
      if (Array.isArray(data?.details))
        message = data.details
          .map(
            (d: { path?: string; message?: string }) =>
              `${d.path ? `${d.path}: ` : ''}${d.message || 'Invalid value'}`,
          )
          .join('\n');
      if (response.status === 401 && token)
        await useSession
          .getState()
          .signOut()
          .catch(() => {});
      throw new ApiError(
        Array.isArray(message) ? message.join('\n') : String(message),
        response.status,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(
        'The connection is taking too long. Please check your internet connection and retry.',
      );
    throw new Error(
      'Could not reach VenueVista. Check your internet connection and API address, then retry.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
export function mediaUri(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  return `${new URL(API_URL).origin}${url.startsWith('/') ? url : `/${url}`}`;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';
export const money = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const humanize = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(' ');
