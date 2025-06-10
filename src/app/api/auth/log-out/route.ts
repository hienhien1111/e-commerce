import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  // Parse the request body
  const data = await supabase.auth.signOut();

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
