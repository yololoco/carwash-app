import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: profile } = await db.from("profiles").select("id, role").eq("clerk_id", userId).single();
  if (!profile || profile.role !== "car_washer") return NextResponse.json({ error: "Not a washer" }, { status: 403 });

  const { location_id } = await req.json();
  const today = new Date().toISOString().split("T")[0];

  // Get cuota amount for location
  const { data: location } = await db.from("locations").select("daily_cuota_amount").eq("id", location_id).single();
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  // Create or update cuota request
  const { data, error } = await db.from("washer_cuotas").upsert({
    washer_id: profile.id,
    location_id,
    date: today,
    amount: location.daily_cuota_amount || 200,
    status: "pending",
  }, { onConflict: "washer_id,location_id,date" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cuota: data });
}
