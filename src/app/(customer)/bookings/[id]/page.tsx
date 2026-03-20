"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { BookingStatus } from "@/components/booking/booking-status";
import { formatMXN } from "@/lib/utils/currency";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Car,
  MapPin,
  User,
  ArrowLeft,
  Loader2,
  ParkingSquare,
  Droplets,
  XCircle,
} from "lucide-react";

interface BookingDetail {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string | null;
  status: string;
  total_price: number;
  base_price: number;
  premium_fee: number;
  discount_amount: number;
  services: string[];
  customer_notes: string | null;
  car: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
    parking_spot: string | null;
  };
  location: {
    name: string;
  };
  package_info: {
    name: string;
  } | null;
  washer_name: string | null;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    if (!user) return;
    async function fetchBooking() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("bookings")
        .select(
          "id, scheduled_date, scheduled_time_start, scheduled_time_end, status, total_price, base_price, premium_fee, discount_amount, services, customer_notes, assigned_washer_id, cars(plate_number, make, model, color, parking_spot), locations(name), packages(name)"
        )
        .eq("id", bookingId)
        .eq("customer_id", user!.id)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }

      let washerName: string | null = null;
      if (data.assigned_washer_id) {
        const { data: washerProfile } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", data.assigned_washer_id)
          .single();
        washerName = washerProfile?.full_name ?? null;
      }

      setBooking({
        ...data,
        car: data.cars ?? { plate_number: "", make: "", model: "", color: "", parking_spot: null },
        location: data.locations ?? { name: "" },
        package_info: data.packages ?? null,
        washer_name: washerName,
        services: (data.services as string[]) ?? [],
      });
      setLoading(false);
    }
    fetchBooking();
  }, [user, bookingId]);

  const canCancel = () => {
    if (!booking) return false;
    if (!["pending", "confirmed"].includes(booking.status)) return false;
    const scheduledDateTime = new Date(
      `${booking.scheduled_date}T${booking.scheduled_time_start}`
    );
    const now = new Date();
    const diffMs = scheduledDateTime.getTime() - now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    return diffMs > twoHoursMs;
  };

  const handleCancel = async () => {
    if (!booking || !user) return;
    setCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { error } = await db
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq("id", booking.id);

    if (!error) {
      setBooking({ ...booking, status: "cancelled" });
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        <Link
          href="/bookings"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Link>
        <p className="text-center text-muted-foreground">
          Reservacion no encontrada.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(
    booking.scheduled_date + "T00:00:00"
  ).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = booking.scheduled_time_start?.slice(0, 5) ?? "";

  return (
    <div className="space-y-4">
      <Link
        href="/bookings"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Mis lavados
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Detalle del lavado</h1>
        <BookingStatus status={booking.status} />
      </div>

      {/* Date & Time */}
      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formattedTime} hrs</span>
          </div>
        </CardContent>
      </Card>

      {/* Car */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vehiculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{booking.car.plate_number}</span>
            <span className="text-muted-foreground">
              {booking.car.make} {booking.car.model} - {booking.car.color}
            </span>
          </div>
          {booking.car.parking_spot && (
            <div className="flex items-center gap-2 text-sm">
              <ParkingSquare className="h-4 w-4 text-muted-foreground" />
              <span>Cajon: {booking.car.parking_spot}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{booking.location.name}</span>
          </div>
        </CardContent>
      </Card>

      {/* Washer */}
      {booking.washer_name && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Lavador: {booking.washer_name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package & Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Servicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {booking.package_info && (
            <div className="flex items-center gap-2 text-sm">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{booking.package_info.name}</span>
            </div>
          )}
          {booking.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {booking.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Desglose de precio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio base</span>
              <span>{formatMXN(booking.base_price ?? 0)}</span>
            </div>
            {(booking.premium_fee ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cargo premium</span>
                <span>+ {formatMXN(booking.premium_fee)}</span>
              </div>
            )}
            {(booking.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>- {formatMXN(booking.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>{formatMXN(booking.total_price)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Button */}
      {canCancel() && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Cancelar lavado
        </Button>
      )}
    </div>
  );
}
