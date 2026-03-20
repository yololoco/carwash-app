import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params;
  const date = req.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  // Get location capacity
  const { data: location } = await db
    .from("locations")
    .select("max_daily_capacity, location_operating_hours(*)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Check operating hours for this day
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayOfWeek = dayNames[new Date(date + "T00:00:00").getDay()];
  const hours = (location.location_operating_hours || []).find(
    (h: { day_of_week: string }) => h.day_of_week === dayOfWeek
  );

  if (!hours || hours.is_closed) {
    return NextResponse.json({
      open: false,
      message: "Cerrado este dia",
      slots: [],
    });
  }

  // Count existing bookings for this date
  const { count: bookedCount } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("scheduled_date", date)
    .neq("status", "cancelled");

  const remaining = Math.max(0, (location.max_daily_capacity || 30) - (bookedCount || 0));

  // Generate time slots (1-hour increments)
  const openHour = parseInt(hours.open_time.split(":")[0]);
  const closeHour = parseInt(hours.close_time.split(":")[0]);
  const slots = [];

  for (let h = openHour; h < closeHour; h++) {
    const start = `${String(h).padStart(2, "0")}:00`;
    const end = `${String(h + 1).padStart(2, "0")}:00`;
    slots.push({ start, end, available: remaining > 0 });
  }

  return NextResponse.json({
    open: true,
    capacity: location.max_daily_capacity,
    booked: bookedCount || 0,
    remaining,
    open_time: hours.open_time,
    close_time: hours.close_time,
    slots,
  });
}
