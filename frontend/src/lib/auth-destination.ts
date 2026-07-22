import type { AuthUser } from './auth';

function validLocalPath(value: string | null): string | null {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function resolvePostLoginDestination(
  user: AuthUser,
  redirect: string | null,
): string {
  const requested = validLocalPath(redirect);
  const admin = user.role?.name === 'admin';
  if (admin) return requested?.startsWith('/admin') ? requested : '/admin';
  return requested && !requested.startsWith('/admin') ? requested : '/';
}
