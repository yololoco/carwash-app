import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailySchedule } from "@/lib/scheduling/fair-scheduler";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Check admin role
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("clerk_id", userId)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { location_id, date } = body;

  if (!location_id || !date) {
    return NextResponse.json({ error: "location_id and date required" }, { status: 400 });
  }

  const result = await generateDailySchedule(location_id, date);
  return NextResponse.json(result);
}
