// ============================================================
// API fetch wrapper with JWT auto-attach and refresh handling
// ============================================================

import { auth, type AuthTokens } from './auth';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

type RefreshResponse = Pick<AuthTokens, 'token'> &
  Partial<Pick<AuthTokens, 'refreshToken' | 'tokenExpires'>>;

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '');
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function parseResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json')
    ? response.json()
    : response.text();
}

async function fetchApi<T = unknown>(
  path: string,
  options: FetchOptions = {},
  hasRetried = false,
): Promise<T> {
  const { skipAuth = false, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (
    requestOptions.body != null &&
    !isFormData(requestOptions.body) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = auth.getAccessToken();
    if (token && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}/${normalizePath(path)}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (response.status === 401 && !skipAuth && !hasRetried) {
    if (await tryRefreshToken()) {
      return fetchApi<T>(path, options, true);
    }

    handleUnauthorized();
    throw new ApiError(401, 'Unauthorized');
  }

  const data = await parseResponseData(response);

  if (!response.ok) {
    const message =
      (typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string' &&
        data.message) ||
      `HTTP ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/v1/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!response.ok) return false;

    const data = (await parseResponseData(response)) as RefreshResponse;
    if (!data || typeof data.token !== 'string') return false;

    auth.setTokens({
      token: data.token,
      refreshToken:
        typeof data.refreshToken === 'string' ? data.refreshToken : refreshToken,
      tokenExpires:
        typeof data.tokenExpires === 'number' ? data.tokenExpires : Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

function handleUnauthorized(): void {
  auth.logout();
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

// ── Convenience methods ────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'DELETE' }),

  /** Upload multipart/form-data (avatar, product images). */
  upload: <T = unknown>(
    path: string,
    formData: FormData,
    options?: FetchOptions,
  ) =>
    fetchApi<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};

export default api;
