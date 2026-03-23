"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BookingStatus } from "@/components/booking/booking-status";
import Link from "next/link";
import {
  Car,
  ArrowRight,
  Plus,
  Droplets,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface ActiveBooking {
  id: string;
  status: string;
  created_at: string;
  car: { plate_number: string; make: string; model: string };
}

interface RecentWash {
  id: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  car: { plate_number: string; make: string; model: string };
  total_price: number | null;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [carCount, setCarCount] = useState(0);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [recentWashes, setRecentWashes] = useState<RecentWash[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const db = createClient() as any;

      const { count } = await db
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .eq("is_active", true);
      setCarCount(count ?? 0);

      // Active on-demand booking
      const { data: activeData } = await db
        .from("bookings")
        .select(
          "id, status, created_at, cars(plate_number, make, model)"
        )
        .eq("customer_id", user!.id)
        .in("status", ["pending", "confirmed", "in_progress", "requested", "broadcast", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeData && activeData.length > 0) {
        const b = activeData[0];
        setActiveBooking({
          ...b,
          car: b.cars ?? { plate_number: "", make: "", model: "" },
        });
      }

      // Recent completed washes
      const { data: recentData } = await db
        .from("bookings")
        .select(
          "id, status, completed_at, created_at, total_price, cars(plate_number, make, model)"
        )
        .eq("customer_id", user!.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(3);

      if (recentData) {
        setRecentWashes(
          recentData.map((b: any) => ({
            ...b,
            car: b.cars ?? { plate_number: "", make: "", model: "" },
          }))
        );
      }

      setLoaded(true);
    }
    fetchData();
  }, [user]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Bienvenido</h1>
        <p className="text-muted-foreground">
          Solicita un lavado a domicilio en minutos.
        </p>
      </div>

      {/* Request Wash CTA */}
      <Link
        href="/request"
        className={buttonVariants({
          size: "lg",
          className:
            "w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 h-14 text-base font-semibold gap-2 shadow-lg",
        })}
      >
        <Droplets className="h-5 w-5" />
        Solicitar lavado
      </Link>

      {/* Active Booking Tracking Card */}
      {activeBooking && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              Lavado en curso
            </CardTitle>
            <BookingStatus status={activeBooking.status} />
          </CardHeader>
          <CardContent>
            <Link
              href={`/bookings/${activeBooking.id}/track`}
              className="block space-y-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {activeBooking.car.plate_number}
                </span>
                <span className="text-muted-foreground">
                  {activeBooking.car.make} {activeBooking.car.model}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                Seguir en tiempo real
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          href="/cars/new"
          className={buttonVariants({
            variant: "outline",
            className:
              "h-auto min-h-[44px] flex-col gap-1.5 py-3 sm:gap-2 sm:py-4",
          })}
        >
          <Plus className="h-5 w-5" />
          <span className="text-[11px] sm:text-xs">Agregar auto</span>
        </Link>
        <Link
          href="/cars"
          className={buttonVariants({
            variant: "outline",
            className:
              "h-auto min-h-[44px] flex-col gap-1.5 py-3 sm:gap-2 sm:py-4",
          })}
        >
          <Car className="h-5 w-5" />
          <span className="text-[11px] sm:text-xs">
            {carCount} {carCount === 1 ? "auto" : "autos"}
          </span>
        </Link>
      </div>

      {/* Recent Completed Washes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            Lavados recientes
          </CardTitle>
          <Link
            href="/bookings"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "text-xs",
            })}
          >
            Ver todos
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {loaded && recentWashes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Droplets className="h-8 w-8" />
              <p>Aun no tienes lavados completados.</p>
              <p>Solicita tu primer lavado ahora.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentWashes.map((wash) => (
                <Link
                  key={wash.id}
                  href={`/bookings/${wash.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {wash.car.plate_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wash.car.make} {wash.car.model}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(
                        wash.completed_at || wash.created_at
                      ).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
