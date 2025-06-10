import { supabase } from "@/lib/supabase";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const { email, password } = signInSchema.parse(json);
  // Parse the request body
  const data = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("Sign-in data:", data);

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
