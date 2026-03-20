import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const startDate = req.nextUrl.searchParams.get("start") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const endDate = req.nextUrl.searchParams.get("end") || new Date().toISOString().split("T")[0];
  const locationId = req.nextUrl.searchParams.get("location_id");

  let query = db
    .from("payments")
    .select("amount, payment_type, created_at, subscription_id, subscriptions(location_id)")
    .eq("status", "succeeded")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59");

  const { data: payments } = await query;

  const totalRevenue = (payments || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
  const subscriptionRevenue = (payments || [])
    .filter((p: { payment_type: string }) => p.payment_type === "subscription")
    .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
  const oneTimeRevenue = totalRevenue - subscriptionRevenue;

  // Revenue by location
  const byLocation: Record<string, number> = {};
  for (const p of payments || []) {
    const locId = p.subscriptions?.location_id || "unknown";
    byLocation[locId] = (byLocation[locId] || 0) + Number(p.amount);
  }

  return NextResponse.json({
    total_revenue: totalRevenue,
    subscription_revenue: subscriptionRevenue,
    one_time_revenue: oneTimeRevenue,
    total_payments: (payments || []).length,
    by_location: byLocation,
    period: { start: startDate, end: endDate },
  });
}
