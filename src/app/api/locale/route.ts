import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !["es", "en"].includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale. Must be 'es' or 'en'." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, locale });

    // Set the locale cookie (1 year expiry)
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    // If user is authenticated, also update their profile preference
    try {
      const { userId } = await auth();

      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = createAdminClient() as any;
        await admin
          .from("profiles")
          .update({ preferred_language: locale })
          .eq("clerk_id", userId);
      }
    } catch {
      // Not authenticated or DB error — ignore, cookie is still set
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to update locale." },
      { status: 500 }
    );
  }
}
