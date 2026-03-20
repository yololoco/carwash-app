"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/components/booking/booking-status";
import Link from "next/link";
import { ClipboardList, Clock, ParkingSquare, MessageSquare, Loader2 } from "lucide-react";

interface QueueBooking {
  id: string;
  scheduled_time_start: string;
  status: string;
  customer_notes: string | null;
  queue_position: number | null;
  car: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
    parking_spot: string | null;
  };
}

export default function WasherQueuePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchQueue() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const today = new Date().toISOString().split("T")[0];

      const { data } = await db
        .from("bookings")
        .select(
          "id, scheduled_time_start, status, customer_notes, queue_position, cars(plate_number, make, model, color, parking_spot)"
        )
        .eq("assigned_washer_id", user!.id)
        .eq("scheduled_date", today)
        .order("queue_position", { ascending: true });

      const mapped = (data ?? []).map((b: Record<string, unknown>) => ({
        ...b,
        car: b.cars ?? {
          plate_number: "",
          make: "",
          model: "",
          color: "",
          parking_spot: null,
        },
      }));

      setBookings(mapped);
      setLoading(false);
    }
    fetchQueue();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi cola de hoy</h1>
          <p className="text-muted-foreground">
            Autos asignados para lavar hoy.
          </p>
        </div>
        <Badge variant="outline" className="text-base">
          {bookings.length} auto{bookings.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No tienes autos asignados hoy.
            </p>
            <p className="text-sm text-muted-foreground">
              Los lavados se asignan automaticamente cada manana.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/washer/bookings/${booking.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-2xl font-bold tracking-wider">
                    {booking.car.plate_number}
                  </CardTitle>
                  <BookingStatus status={booking.status} />
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {booking.car.make} {booking.car.model} - {booking.car.color}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    {booking.car.parking_spot && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ParkingSquare className="h-4 w-4" />
                        <span>Cajon {booking.car.parking_spot}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{booking.scheduled_time_start?.slice(0, 5)}</span>
                    </div>
                  </div>

                  {booking.customer_notes && (
                    <div className="flex items-start gap-1 rounded-md bg-muted p-2 text-xs">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <span>{booking.customer_notes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
