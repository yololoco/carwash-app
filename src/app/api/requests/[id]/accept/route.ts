import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: profile } = await db.from("profiles").select("id, role").eq("clerk_id", userId).single();
  if (!profile || profile.role !== "car_washer") return NextResponse.json({ error: "Not a washer" }, { status: 403 });

  // Check cuota is paid today
  const today = new Date().toISOString().split("T")[0];
  const { data: cuota } = await db.from("washer_cuotas")
    .select("id").eq("washer_id", profile.id).eq("date", today).eq("status", "paid").single();

  if (!cuota) return NextResponse.json({ error: "Debes pagar tu cuota antes de aceptar solicitudes" }, { status: 403 });

  // Check booking is still available
  const { data: booking } = await db.from("bookings").select("status, is_on_demand").eq("id", bookingId).single();
  if (!booking || booking.status !== "pending" || !booking.is_on_demand) {
    return NextResponse.json({ error: "Esta solicitud ya no esta disponible" }, { status: 409 });
  }

  // Accept the request
  await db.from("bookings").update({
    status: "confirmed",
    assigned_washer_id: profile.id,
    accepted_at: new Date().toISOString(),
  }).eq("id", bookingId);

  // Record response
  await db.from("wash_request_responses").insert({
    booking_id: bookingId,
    washer_id: profile.id,
    response: "accepted",
  });

  // Notify customer
  const { data: bookingFull } = await db.from("bookings").select("customer_id").eq("id", bookingId).single();
  if (bookingFull) {
    await db.from("notifications").insert({
      user_id: bookingFull.customer_id,
      type: "wash_scheduled",
      title: "Lavador asignado!",
      body: "Un lavador acepto tu solicitud y va en camino.",
      data: { booking_id: bookingId },
    });
  }

  return NextResponse.json({ success: true });
}
