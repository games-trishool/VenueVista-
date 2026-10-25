export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function createApiClient(config: {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
}) {
  return {
    async request<T>(
      path: string,
      options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
    ): Promise<T> {
      const token = await config.getToken?.();
      const response = await fetch(
        `${config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
        {
          method: options.method ?? 'GET',
          signal: options.signal,
          headers: {
            ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        },
      );
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new ApiError(
          body?.error?.message ?? body?.message ?? `Request failed (${response.status})`,
          response.status,
        );
      return body as T;
    },
  };
}
