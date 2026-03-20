"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "@/components/booking/booking-card";
import { Calendar, History, Loader2 } from "lucide-react";

interface Booking {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  status: string;
  total_price: number;
  services: string[];
  car: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
  };
  location: {
    name: string;
  };
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchBookings() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("bookings")
        .select(
          "id, scheduled_date, scheduled_time_start, status, total_price, services, cars(plate_number, make, model, color), locations(name)"
        )
        .eq("customer_id", user!.id)
        .order("scheduled_date", { ascending: false });

      const mapped = (data ?? []).map((b: Record<string, unknown>) => ({
        ...b,
        car: b.cars ?? { plate_number: "", make: "", model: "", color: "" },
        location: b.locations ?? { name: "" },
        services: (b.services as string[]) ?? [],
      }));

      setBookings(mapped);
      setLoading(false);
    }
    fetchBookings();
  }, [user]);

  const upcoming = bookings.filter(
    (b) => !["completed", "cancelled"].includes(b.status)
  );
  const history = bookings.filter((b) =>
    ["completed", "cancelled"].includes(b.status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis lavados</h1>
        <p className="text-muted-foreground">
          Consulta tus lavados programados y tu historial.
        </p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming">Proximos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Calendar className="h-10 w-10" />
              <p>No tienes lavados proximos.</p>
              <p>Suscribete a un plan para programar tu primer lavado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <History className="h-10 w-10" />
              <p>Aun no tienes historial de lavados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
