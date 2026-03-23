import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: profile } = await db.from("profiles").select("id").eq("clerk_id", userId).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Record rejection
  await db.from("wash_request_responses").upsert({
    booking_id: bookingId,
    washer_id: profile.id,
    response: "rejected",
  }, { onConflict: "booking_id,washer_id" });

  return NextResponse.json({ success: true });
}
