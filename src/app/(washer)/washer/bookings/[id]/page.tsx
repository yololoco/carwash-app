"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BookingStatus } from "@/components/booking/booking-status";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  MapPin,
  ParkingSquare,
  User,
  MessageSquare,
  Droplets,
  Info,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

interface WasherBookingDetail {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  status: string;
  services: string[];
  customer_notes: string | null;
  car: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
    photo_url: string | null;
    parking_spot: string | null;
  };
  location: {
    name: string;
    parking_instructions: string | null;
    access_instructions: string | null;
  };
  customer_name: string | null;
}

export default function WasherBookingDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState<WasherBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const bookingId = params.id as string;

  useEffect(() => {
    if (!user) return;
    async function fetchBooking() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("bookings")
        .select(
          "id, scheduled_date, scheduled_time_start, status, services, customer_notes, customer_id, cars(plate_number, make, model, color, photo_url, parking_spot), locations(name, parking_instructions, access_instructions)"
        )
        .eq("id", bookingId)
        .eq("assigned_washer_id", user!.id)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }

      let customerName: string | null = null;
      if (data.customer_id) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", data.customer_id)
          .single();
        customerName = profile?.full_name ?? null;
      }

      setBooking({
        ...data,
        car: data.cars ?? {
          plate_number: "",
          make: "",
          model: "",
          color: "",
          photo_url: null,
          parking_spot: null,
        },
        location: data.locations ?? {
          name: "",
          parking_instructions: null,
          access_instructions: null,
        },
        customer_name: customerName,
        services: (data.services as string[]) ?? [],
      });
      setLoading(false);
    }
    fetchBooking();
  }, [user, bookingId]);

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
          href="/washer/queue"
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

  return (
    <div className="space-y-4">
      <Link
        href="/washer/queue"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Mi cola
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Detalle del lavado</h1>
        <BookingStatus status={booking.status} />
      </div>

      {/* Car Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vehiculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {booking.car.photo_url && (
            <div className="overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={booking.car.photo_url}
                alt={`${booking.car.make} ${booking.car.model}`}
                className="h-40 w-full object-cover"
              />
            </div>
          )}
          {!booking.car.photo_url && (
            <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold tracking-wider">
              {booking.car.plate_number}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.car.make} {booking.car.model} - {booking.car.color}
          </p>
        </CardContent>
      </Card>

      {/* Parking & Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ubicacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {booking.car.parking_spot && (
            <div className="flex items-center gap-2 text-sm">
              <ParkingSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                Cajon {booking.car.parking_spot}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{booking.location.name}</span>
          </div>
          {booking.location.parking_instructions && (
            <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-xs">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">Instrucciones de estacionamiento:</span>{" "}
                {booking.location.parking_instructions}
              </div>
            </div>
          )}
          {booking.location.access_instructions && (
            <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-xs">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">Instrucciones de acceso:</span>{" "}
                {booking.location.access_instructions}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer */}
      {booking.customer_name && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Cliente: {booking.customer_name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {booking.customer_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{booking.customer_notes}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {booking.services.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {booking.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Droplets className="mr-1 inline h-3 w-3" />
                  {service}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {(booking.status === "confirmed" || booking.status === "pending") && (
        <Link
          href={`/washer/wash/${bookingId}/start`}
          className={buttonVariants({ size: "lg" }) + " w-full"}
        >
          <Droplets className="mr-1 h-4 w-4" />
          Iniciar lavado
        </Link>
      )}
    </div>
  );
}
