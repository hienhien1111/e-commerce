import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.log('Sign-up request body:', json);
    const { email, password } = signUpSchema.parse(json);
    // Parse the request body
    const data = await supabase.auth.signUp({
      email,
      password,
    });

    console.log('Sign-up data:', data);

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: `Internal server error ${err}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
