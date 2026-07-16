// ============================================================
// API fetch wrapper with HttpOnly cookie session refresh handling
// ============================================================

import { auth } from './auth';

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

export function getValidationError(
  error: unknown,
  field: string,
): string | undefined {
  if (!(error instanceof ApiError) || typeof error.data !== 'object') {
    return undefined;
  }

  const errors = (error.data as { errors?: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) {
    return undefined;
  }

  const value = (errors as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '');
}

/** Build an absolute API URL from a path relative to the configured `/api` base. */
export function apiUrl(path: string): string {
  return `${API_URL}/${normalizePath(path)}`;
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

  const response = await fetch(apiUrl(path), {
    ...requestOptions,
    headers: requestHeaders,
    credentials: requestOptions.credentials ?? 'include',
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
  try {
    const response = await fetch(apiUrl('v1/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    return response.ok;
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
