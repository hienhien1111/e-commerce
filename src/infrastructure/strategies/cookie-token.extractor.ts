import type { Request } from 'express';

export function extractCookieToken(
  request: Request | undefined,
  cookieName: string,
): string | null {
  const cookieHeader = request?.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(cookieName.length + 1));
  } catch {
    return null;
  }
}
