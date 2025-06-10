import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccessToken } from "@/lib/auth";
import {supabase} from "@/lib/supabase";

/**
 * Middleware to protect sensitive API routes
 * This provides edge-level protection before the request reaches the route handler
 */
export async function middleware(req: NextRequest) {
    const token = getAccessToken(req);
    console.log("Token from middleware:", token);
    if (!token) {
        return NextResponse.json(
            { error: "Missing or invalid authorization token" },
            { status: 401 }
        );
    }

    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        return NextResponse.next();
    } catch (error) {
        console.error("Authentication error:", error);
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 401 }
        );
    }
}

export const config = {
    matcher: [
        "/api/:path*",
    ],
};
