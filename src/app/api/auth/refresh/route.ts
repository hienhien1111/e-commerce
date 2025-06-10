// app/api/auth/refresh/route.js
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    console.log("Received refresh token:", refresh_token);

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: "Refresh token is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.session?.user.id,
          email: data.session?.user.email,
          role: data.session?.user.user_metadata.role || "user",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: `Internal server error ${err}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
