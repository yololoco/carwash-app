"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMXN } from "@/lib/utils/currency";
import Link from "next/link";
import {
  Bell,
  Car,
  MapPin,
  User,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface RequestItem {
  id: string;
  created_at: string;
  total_price: number | null;
  estimated_price: number | null;
  notes: string | null;
  cars: {
    plate_number: string;
    make: string;
    model: string;
    color: string | null;
    parking_spot: string | null;
  } | null;
  locations: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default function WasherRequestsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cuotaPaid, setCuotaPaid] = useState<boolean | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchCuotaStatus = useCallback(async () => {
    if (!profile) return;
    const db = createClient() as any;
    const { data } = await db
      .from("washer_cuotas")
      .select("status")
      .eq("washer_id", profile.id)
      .eq("date", today)
      .single();
    setCuotaPaid(data?.status === "paid");
  }, [profile, today]);

  const fetchRequests = useCallback(async () => {
    const db = createClient() as any;
    const { data } = await db
      .from("bookings")
      .select(
        "*, cars(plate_number, make, model, color, parking_spot), locations(name), profiles!customer_id(full_name)"
      )
      .eq("is_on_demand", true)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchCuotaStatus();
    fetchRequests();
  }, [fetchCuotaStatus, fetchRequests]);

  // Realtime for incoming requests
  useRealtime({
    table: "bookings",
    filter: "is_on_demand=eq.true",
    event: "*",
    onPayload: () => {
      fetchRequests();
    },
  });

  const handleAccept = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const res = await fetch(`/api/requests/${bookingId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/washer/bookings/${bookingId}`);
      }
    } catch {
      // Error handled silently
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await fetch(`/api/requests/${bookingId}/reject`, {
        method: "POST",
      });
      await fetchRequests();
    } catch {
      // Error handled silently
    } finally {
      setProcessingId(null);
    }
  };

  function timeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Justo ahora";
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `Hace ${hrs}h ${mins % 60}m`;
  }

  // Cuota not paid banner
  if (cuotaPaid === false) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold sm:text-2xl">Solicitudes</h1>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
            <p className="font-semibold">
              Paga tu cuota para ver solicitudes
            </p>
            <p className="text-sm text-muted-foreground">
              Necesitas pagar la cuota del dia para poder aceptar lavados.
            </p>
            <Link
              href="/washer/today"
              className={buttonVariants({
                className: "bg-yellow-600 text-white hover:bg-yellow-700",
              })}
            >
              Ir a pagar cuota
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Solicitudes</h1>
        {requests.length > 0 && (
          <Badge className="bg-red-600 text-white">{requests.length}</Badge>
        )}
      </div>

      {/* Loading state */}
      {!loaded && cuotaPaid === null && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      )}

      {/* No requests */}
      {loaded && requests.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No hay solicitudes pendientes</p>
          <p className="text-sm text-muted-foreground">
            Las nuevas solicitudes apareceran aqui en tiempo real.
          </p>
        </div>
      )}

      {/* Request Cards */}
      <div className="space-y-3">
        {requests.map((req) => (
          <Card key={req.id} className="overflow-hidden">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Car plate - prominent */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-bold">
                      {req.cars?.plate_number || "---"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {timeSince(req.created_at)}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Car className="h-3.5 w-3.5" />
                    <span>
                      {req.cars?.make} {req.cars?.model}
                      {req.cars?.color ? ` (${req.cars.color})` : ""}
                    </span>
                  </div>
                  {req.locations && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{req.locations.name}</span>
                    </div>
                  )}
                  {req.profiles && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{req.profiles.full_name}</span>
                    </div>
                  )}
                  {req.cars?.parking_spot && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Lugar: {req.cars.parking_spot}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                {(req.total_price || req.estimated_price) && (
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">
                      {formatMXN(req.total_price || req.estimated_price || 0)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1"
                  >
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => handleAccept(req.id)}
                    disabled={processingId === req.id}
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  >
                    {processingId === req.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Aceptar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
