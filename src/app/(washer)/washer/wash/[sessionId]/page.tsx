"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import WashTimer from "@/components/wash/wash-timer";
import Link from "next/link";
import { Loader2, CheckSquare, Square, Droplets } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
}

interface WashSessionData {
  id: string;
  started_at: string;
  booking_id: string;
  booking: {
    services: string[];
  };
}

export default function ActiveWashPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<WashSessionData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [checkedServices, setCheckedServices] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const db = createClient() as any;

      // Fetch wash session with booking
      const { data: sessionData } = await db
        .from("wash_sessions")
        .select("id, started_at, booking_id, bookings(services)")
        .eq("id", sessionId)
        .eq("washer_id", user!.id)
        .single();

      if (!sessionData) {
        setLoading(false);
        return;
      }

      const bookingServices = (sessionData.bookings?.services as string[]) ?? [];

      setSession({
        id: sessionData.id,
        started_at: sessionData.started_at,
        booking_id: sessionData.booking_id,
        booking: { services: bookingServices },
      });

      // Fetch service names from catalog
      if (bookingServices.length > 0) {
        const { data: catalog } = await db
          .from("service_catalog")
          .select("id, name")
          .in("id", bookingServices);

        setServices(catalog ?? []);
      }

      setLoading(false);
    }

    fetchData();
  }, [user, sessionId]);

  function toggleService(serviceId: string) {
    setCheckedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Link
          href="/washer/queue"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Volver
        </Link>
        <p className="text-center text-muted-foreground">
          Sesion de lavado no encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      <Card>
        <CardContent className="py-6">
          <WashTimer startedAt={session.started_at} />
        </CardContent>
      </Card>

      {/* Services checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Droplets className="h-4 w-4" />
            Servicios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.length > 0 ? (
            services.map((service) => {
              const isChecked = checkedServices.has(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                    isChecked
                      ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                      : "border-border"
                  }`}
                  onClick={() => toggleService(service.id)}
                >
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <Square className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isChecked
                        ? "text-green-700 line-through dark:text-green-400"
                        : ""
                    }`}
                  >
                    {service.name}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No se encontraron servicios en el catalogo.
            </p>
          )}

          {services.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {checkedServices.size} de {services.length} completados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Complete button */}
      <Link
        href={`/washer/wash/${sessionId}/complete`}
        className={buttonVariants({ variant: "default", size: "lg" }) + " w-full"}
      >
        Completar lavado
      </Link>
    </div>
  );
}
