import { supabase } from '@/lib/supabase';

export interface Session {
  user: {
    id: string;
    role?: string;
  };
}

export function getAccessToken(req?: Request): string | null {
  const authHeader = req?.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
}

export async function auth(req?: Request): Promise<Session | null> {
  try {
    const token = getAccessToken(req);
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return {
      user: { id: data.user.id, role: data.user.user_metadata.role },
    };
  } catch {
    return null;
  }
}
