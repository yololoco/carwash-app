import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: profile } = await db.from("profiles").select("id").eq("clerk_id", userId).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { car_id, location_id, services, notes } = await req.json();

  // Get location commission rate
  const { data: location } = await db.from("locations").select("commission_rate, daily_cuota_amount").eq("id", location_id).single();
  const commissionRate = location?.commission_rate || 15;

  // Calculate price from services
  const { data: serviceCatalog } = await db.from("service_catalog").select("id, name").in("id", services);

  // Use a base price (from first matching package or fixed rate)
  const { data: fees } = await db.from("premium_fees").select("amount").eq("fee_type", "one_time_surcharge").eq("is_active", true).limit(1);
  const basePrice = 149; // Base wash price MXN
  const totalPrice = basePrice + (fees?.[0]?.amount || 0);

  // Get broadcast timeout
  const { data: timeoutSetting } = await db.from("app_settings").select("value").eq("key", "broadcast_timeout_minutes").single();
  const timeoutMinutes = parseInt(timeoutSetting?.value || "10");

  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();

  // Create booking as on-demand request
  const { data: booking, error } = await db.from("bookings").insert({
    customer_id: profile.id,
    car_id,
    location_id,
    services: services || [],
    scheduled_date: new Date().toISOString().split("T")[0],
    status: "pending",
    is_on_demand: true,
    is_one_time: true,
    base_price: basePrice,
    total_price: totalPrice,
    commission_rate: commissionRate,
    customer_notes: notes || null,
    broadcast_expires_at: expiresAt,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ booking_id: booking.id, expires_at: expiresAt });
}
