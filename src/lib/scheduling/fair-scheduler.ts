// myWash Scheduling Engine
// Generates daily bookings from active subscriptions and assigns washers

import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculatePriorityScore,
  frequencyToDays,
  shouldWashOnDate,
} from "./priority-calculator";

interface GenerateResult {
  location_id: string;
  date: string;
  bookings_created: number;
  bookings_assigned: number;
  overflow_to_waitlist: number;
  errors: string[];
}

export async function generateDailySchedule(
  locationId: string,
  dateStr: string
): Promise<GenerateResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const date = new Date(dateStr);
  const errors: string[] = [];

  const result: GenerateResult = {
    location_id: locationId,
    date: dateStr,
    bookings_created: 0,
    bookings_assigned: 0,
    overflow_to_waitlist: 0,
    errors: [],
  };

  // 1. Get location + capacity
  const { data: location } = await db
    .from("locations")
    .select("*, location_operating_hours(*)")
    .eq("id", locationId)
    .single();

  if (!location || !location.is_active) {
    result.errors.push("Location not found or inactive");
    return result;
  }

  // Check if location is open on this day
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayOfWeek = dayNames[date.getDay()];
  const todayHours = (location.location_operating_hours || []).find(
    (h: { day_of_week: string }) => h.day_of_week === dayOfWeek
  );

  if (!todayHours || todayHours.is_closed) {
    result.errors.push(`Location closed on ${dayOfWeek}`);
    return result;
  }

  // 2. Get active subscriptions at this location
  const { data: subscriptions } = await db
    .from("subscriptions")
    .select("*, wash_packages(frequency, included_services, base_price), cars(id, plate_number)")
    .eq("location_id", locationId)
    .eq("status", "active");

  if (!subscriptions || subscriptions.length === 0) {
    return result;
  }

  // 3. Get existing bookings for this date (avoid duplicates)
  const { data: existingBookings } = await db
    .from("bookings")
    .select("subscription_id, car_id")
    .eq("location_id", locationId)
    .eq("scheduled_date", dateStr)
    .neq("status", "cancelled");

  const existingSet = new Set(
    (existingBookings || []).map(
      (b: { subscription_id: string; car_id: string }) => `${b.subscription_id}_${b.car_id}`
    )
  );

  // 4. Get last wash date per car for priority calculation
  const carIds = subscriptions.map((s: { car_id: string }) => s.car_id);
  const { data: lastWashes } = await db
    .from("bookings")
    .select("car_id, scheduled_date")
    .in("car_id", carIds)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false });

  const lastWashMap = new Map<string, Date>();
  for (const w of lastWashes || []) {
    if (!lastWashMap.has(w.car_id)) {
      lastWashMap.set(w.car_id, new Date(w.scheduled_date));
    }
  }

  // 5. Create bookings for eligible subscriptions
  const newBookings: {
    subscription: typeof subscriptions[0];
    priorityScore: number;
  }[] = [];

  for (const sub of subscriptions) {
    const key = `${sub.id}_${sub.car_id}`;
    if (existingSet.has(key)) continue; // Already booked

    const freq = sub.wash_packages?.frequency || "weekly";
    const lastWash = lastWashMap.get(sub.car_id) || null;

    if (!shouldWashOnDate(sub.preferred_days, freq, date, lastWash)) continue;

    const daysSinceLastWash = lastWash
      ? Math.floor((date.getTime() - lastWash.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const customerCreatedAt = new Date(sub.created_at);
    const tenureMonths = Math.floor(
      (date.getTime() - customerCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const priority = calculatePriorityScore(
      {
        subscription_id: sub.id,
        customer_id: sub.customer_id,
        car_id: sub.car_id,
        is_one_time: false,
        is_emergency: false,
        rescheduled_from: null,
        created_at: sub.created_at,
      },
      {
        daysSinceLastWash,
        expectedFrequencyDays: frequencyToDays(freq),
        customerTenureMonths: tenureMonths,
        fromWaitlist: false,
      }
    );

    newBookings.push({ subscription: sub, priorityScore: priority });
  }

  // Sort by priority (highest first)
  newBookings.sort((a, b) => b.priorityScore - a.priorityScore);

  // 6. Check capacity
  const existingCount = (existingBookings || []).length;
  const maxCapacity = location.max_daily_capacity || 30;
  const available = Math.max(0, maxCapacity - existingCount);

  // 7. Get available washers
  const { data: washers } = await db
    .from("location_staff")
    .select("user_id, washer_profiles(hourly_rate, avg_rating, avg_wash_duration_minutes, is_available)")
    .eq("location_id", locationId)
    .eq("role", "car_washer")
    .eq("is_active", true);

  // Filter out unavailable washers
  const { data: unavailable } = await db
    .from("washer_availability")
    .select("washer_id")
    .eq("date", dateStr)
    .eq("is_available", false);

  const unavailableSet = new Set((unavailable || []).map((u: { washer_id: string }) => u.washer_id));
  const availableWashers = (washers || []).filter(
    (w: { user_id: string; washer_profiles: { is_available: boolean } | null }) =>
      !unavailableSet.has(w.user_id) && w.washer_profiles?.is_available !== false
  );

  // Track washer load
  const washerLoad = new Map<string, number>();
  for (const w of availableWashers) {
    washerLoad.set(w.user_id, 0);
  }

  // Count existing assignments
  const { data: existingAssignments } = await db
    .from("bookings")
    .select("assigned_washer_id")
    .eq("location_id", locationId)
    .eq("scheduled_date", dateStr)
    .neq("status", "cancelled")
    .not("assigned_washer_id", "is", null);

  for (const a of existingAssignments || []) {
    const curr = washerLoad.get(a.assigned_washer_id) || 0;
    washerLoad.set(a.assigned_washer_id, curr + 1);
  }

  // 8. Insert bookings and assign washers
  for (let i = 0; i < newBookings.length; i++) {
    const { subscription: sub, priorityScore } = newBookings[i];

    if (i >= available) {
      // Over capacity — add to waitlist
      await db.from("waitlist").upsert({
        customer_id: sub.customer_id,
        car_id: sub.car_id,
        location_id: locationId,
        desired_date: dateStr,
        package_id: sub.package_id,
        services: sub.wash_packages?.included_services || [],
      }, { onConflict: "customer_id,car_id,location_id,desired_date" });
      result.overflow_to_waitlist++;
      continue;
    }

    // Assign washer (least loaded, then highest rated)
    let assignedWasherId = "" as string;
    if (availableWashers.length > 0) {
      const sorted = [...availableWashers].sort((a, b) => {
        const loadA = washerLoad.get(a.user_id) || 0;
        const loadB = washerLoad.get(b.user_id) || 0;
        if (loadA !== loadB) return loadA - loadB; // Least loaded first
        const ratingA = a.washer_profiles?.avg_rating || 0;
        const ratingB = b.washer_profiles?.avg_rating || 0;
        return ratingB - ratingA; // Highest rated first
      });
      assignedWasherId = sorted[0].user_id;
      washerLoad.set(assignedWasherId, (washerLoad.get(assignedWasherId) || 0) + 1);
    }

    const { error } = await db.from("bookings").insert({
      customer_id: sub.customer_id,
      car_id: sub.car_id,
      location_id: locationId,
      subscription_id: sub.id,
      package_id: sub.package_id,
      services: sub.wash_packages?.included_services || [],
      scheduled_date: dateStr,
      scheduled_time_start: sub.preferred_time_start || todayHours.open_time,
      scheduled_time_end: sub.preferred_time_end || null,
      assigned_washer_id: assignedWasherId || null,
      status: assignedWasherId ? "confirmed" : "pending",
      base_price: sub.wash_packages?.base_price || 0,
      total_price: sub.wash_packages?.base_price || 0,
      priority_score: priorityScore,
      queue_position: i + 1,
    });

    if (error) {
      errors.push(`Failed to create booking for sub ${sub.id}: ${error.message}`);
    } else {
      result.bookings_created++;
      if (assignedWasherId) result.bookings_assigned++;
    }
  }

  result.errors = errors;
  return result;
}
