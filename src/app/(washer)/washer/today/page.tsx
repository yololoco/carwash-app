"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatus } from "@/components/booking/booking-status";
import { formatMXN } from "@/lib/utils/currency";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Car,
  Droplets,
  ArrowRight,
} from "lucide-react";

interface CuotaStatus {
  id: string;
  status: string;
  amount: number;
  date: string;
  location_id: string;
}

interface LocationItem {
  location_id: string;
  locations: { id: string; name: string };
}

interface ActiveWash {
  id: string;
  status: string;
  car: { plate_number: string; make: string; model: string };
}

export default function WasherTodayPage() {
  const { profile } = useAuth();
  const [cuota, setCuota] = useState<CuotaStatus | null>(null);
  const [cuotaLoaded, setCuotaLoaded] = useState(false);
  const [todayWashes, setTodayWashes] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeWash, setActiveWash] = useState<ActiveWash | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [payingCuota, setPayingCuota] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchCuota = useCallback(async () => {
    if (!profile) return;
    const db = createClient() as any;
    const { data } = await db
      .from("washer_cuotas")
      .select("*")
      .eq("washer_id", profile.id)
      .eq("date", today)
      .single();
    setCuota(data || null);
    setCuotaLoaded(true);
  }, [profile, today]);

  const fetchTodayStats = useCallback(async () => {
    if (!profile) return;
    const db = createClient() as any;

    // Count completed washes today
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("washer_id", profile.id)
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`)
      .lt("completed_at", `${today}T23:59:59`);
    setTodayWashes(count ?? 0);

    // Sum earnings today
    const { data: earningsData } = await db
      .from("bookings")
      .select("washer_earnings")
      .eq("washer_id", profile.id)
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`)
      .lt("completed_at", `${today}T23:59:59`);

    if (earningsData) {
      const total = earningsData.reduce(
        (sum: number, b: any) => sum + (b.washer_earnings || 0),
        0
      );
      setTodayEarnings(total);
    }

    // Active wash
    const { data: activeData } = await db
      .from("bookings")
      .select("id, status, cars(plate_number, make, model)")
      .eq("washer_id", profile.id)
      .in("status", ["confirmed", "in_progress"])
      .limit(1);

    if (activeData && activeData.length > 0) {
      const b = activeData[0];
      setActiveWash({
        ...b,
        car: b.cars ?? { plate_number: "", make: "", model: "" },
      });
    } else {
      setActiveWash(null);
    }
  }, [profile, today]);

  useEffect(() => {
    fetchCuota();
    fetchTodayStats();
  }, [fetchCuota, fetchTodayStats]);

  // Fetch washer locations
  useEffect(() => {
    if (!profile) return;
    async function fetchLocations() {
      const db = createClient() as any;
      const { data } = await db
        .from("location_staff")
        .select("location_id, locations(id, name)")
        .eq("staff_id", profile!.id);
      if (data) setLocations(data);
    }
    fetchLocations();
  }, [profile]);

  // Realtime for cuota changes
  useRealtime({
    table: "washer_cuotas",
    filter: `washer_id=eq.${profile?.id}`,
    event: "*",
    onPayload: () => {
      fetchCuota();
    },
  });

  const handlePayCuota = async (locationId?: string) => {
    if (locations.length === 0) return;

    // If multiple locations and no selection yet, show dialog
    if (locations.length > 1 && !locationId) {
      setShowLocationDialog(true);
      return;
    }

    const locId = locationId || locations[0]?.location_id;
    if (!locId) return;

    setPayingCuota(true);
    try {
      const res = await fetch("/api/cuotas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locId }),
      });

      if (res.ok) {
        await fetchCuota();
      }
    } catch {
      // Error silently handled
    } finally {
      setPayingCuota(false);
      setShowLocationDialog(false);
    }
  };

  const cuotaStatus = cuota?.status;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Mi dia</h1>

      {/* Cuota Status Card */}
      <Card
        className={
          cuotaStatus === "paid"
            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
            : cuotaStatus === "pending"
            ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
            : "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
        }
      >
        <CardContent className="pt-6">
          {cuotaLoaded && !cuota && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold">Cuota pendiente</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMXN(200)} MXN
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handlePayCuota()}
                disabled={payingCuota}
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                {payingCuota ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Pagar cuota
              </Button>
            </div>
          )}

          {cuotaStatus === "pending" && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                  Esperando confirmacion...
                </p>
                <p className="text-sm text-muted-foreground">
                  Tu pago sera verificado por el gerente.
                </p>
              </div>
            </div>
          )}

          {cuotaStatus === "paid" && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-400">
                  Cuota pagada — Activo
                </p>
                <p className="text-sm text-muted-foreground">
                  Ya puedes recibir solicitudes de lavado.
                </p>
              </div>
            </div>
          )}

          {!cuotaLoaded && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <Droplets className="mb-2 h-6 w-6 text-blue-600" />
            <p className="text-2xl font-bold">{todayWashes}</p>
            <p className="text-xs text-muted-foreground">Lavados hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <span className="mb-2 text-2xl">$</span>
            <p className="text-2xl font-bold">{formatMXN(todayEarnings)}</p>
            <p className="text-xs text-muted-foreground">Ganancia hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Wash */}
      {activeWash && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              Lavado activo
            </CardTitle>
            <BookingStatus status={activeWash.status} />
          </CardHeader>
          <CardContent>
            <Link
              href={`/washer/bookings/${activeWash.id}`}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{activeWash.car.plate_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeWash.car.make} {activeWash.car.model}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Location Selection Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogTitle>Selecciona ubicacion</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Elige la ubicacion donde pagaras la cuota hoy.
          </p>
          <Select
            value={selectedLocation}
            onValueChange={(v) => v && setSelectedLocation(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona ubicacion" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.location_id} value={loc.location_id}>
                  {loc.locations?.name || loc.location_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 pt-2">
            <DialogClose render={<Button variant="outline" className="flex-1" />}>
              Cancelar
            </DialogClose>
            <Button
              onClick={() => handlePayCuota(selectedLocation)}
              disabled={!selectedLocation || payingCuota}
              className="flex-1"
            >
              {payingCuota ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
