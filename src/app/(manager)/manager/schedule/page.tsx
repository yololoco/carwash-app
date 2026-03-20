"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingStatus } from "@/components/booking/booking-status";
import { Loader2, Calendar, Clock, Car, User } from "lucide-react";

interface ScheduleBooking {
  id: string;
  scheduled_time_start: string;
  status: string;
  assigned_washer_id: string | null;
  car_plate: string;
  customer_name: string;
  washer_name: string | null;
}

interface Washer {
  id: string;
  full_name: string;
}

export default function ManagerSchedulePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [washers, setWashers] = useState<Washer[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch manager's location
  useEffect(() => {
    if (!user) return;
    async function fetchLocation() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("location_staff")
        .select("location_id")
        .eq("user_id", user!.id)
        .limit(1)
        .single();

      if (data) {
        setLocationId(data.location_id);
      } else {
        setLoading(false);
      }
    }
    fetchLocation();
  }, [user]);

  // Fetch bookings + washers when date or location changes
  useEffect(() => {
    if (!locationId) return;
    async function fetchData() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      // Fetch bookings for the date at this location
      const { data: bookingData } = await db
        .from("bookings")
        .select(
          "id, scheduled_time_start, status, assigned_washer_id, customer_id, cars(plate_number), profiles!bookings_customer_id_fkey(full_name)"
        )
        .eq("location_id", locationId)
        .eq("scheduled_date", selectedDate)
        .order("scheduled_time_start", { ascending: true });

      // Gather washer IDs to fetch their names
      const washerIds = (bookingData ?? [])
        .map((b: Record<string, unknown>) => b.assigned_washer_id)
        .filter(Boolean);

      let washerMap = new Map<string, string>();
      if (washerIds.length > 0) {
        const { data: washerProfiles } = await db
          .from("profiles")
          .select("id, full_name")
          .in("id", washerIds);
        washerMap = new Map(
          (washerProfiles ?? []).map((w: { id: string; full_name: string }) => [
            w.id,
            w.full_name,
          ])
        );
      }

      const mapped: ScheduleBooking[] = (bookingData ?? []).map(
        (b: Record<string, unknown>) => ({
          id: b.id,
          scheduled_time_start: b.scheduled_time_start,
          status: b.status,
          assigned_washer_id: b.assigned_washer_id,
          car_plate:
            (b.cars as { plate_number: string } | null)?.plate_number ?? "",
          customer_name:
            (b.profiles as { full_name: string } | null)?.full_name ??
            "Cliente",
          washer_name: b.assigned_washer_id
            ? washerMap.get(b.assigned_washer_id as string) ?? null
            : null,
        })
      );

      setBookings(mapped);

      // Fetch available washers at this location
      const { data: staffData } = await db
        .from("location_staff")
        .select("user_id, profiles(id, full_name)")
        .eq("location_id", locationId)
        .eq("role", "car_washer");

      const washerList: Washer[] = (staffData ?? []).map(
        (s: Record<string, unknown>) => ({
          id: (s.profiles as { id: string })?.id ?? s.user_id,
          full_name:
            (s.profiles as { full_name: string })?.full_name ?? "Lavador",
        })
      );

      setWashers(washerList);
      setLoading(false);
    }
    fetchData();
  }, [locationId, selectedDate]);

  const reassignWasher = async (bookingId: string, washerId: string) => {
    setUpdating(bookingId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db
      .from("bookings")
      .update({ assigned_washer_id: washerId })
      .eq("id", bookingId);

    const washer = washers.find((w) => w.id === washerId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              assigned_washer_id: washerId,
              washer_name: washer?.full_name ?? null,
            }
          : b
      )
    );
    setUpdating(null);
  };

  if (!locationId && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Programacion</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tienes una ubicacion asignada.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programacion</h1>
        <p className="text-muted-foreground">
          Administra los lavados del dia en tu ubicacion.
        </p>
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Fecha
        </Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay lavados programados para esta fecha.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">
                  {booking.car_plate}
                </CardTitle>
                <BookingStatus status={booking.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{booking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {(booking.scheduled_time_start as string)?.slice(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Washer Assignment */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Lavador asignado
                  </Label>
                  <Select
                    value={booking.assigned_washer_id ?? undefined}
                    onValueChange={(v) =>
                      v && reassignWasher(booking.id, v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar lavador" />
                    </SelectTrigger>
                    <SelectContent>
                      {washers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updating === booking.id && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Actualizando...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
