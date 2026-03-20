"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Loader2, User, Car, MapPin, Package } from "lucide-react";

interface AdminSubscriptionRow {
  id: string;
  status: string;
  payment_provider: string;
  preferred_days: string[] | null;
  current_period_start: string | null;
  current_period_end: string | null;
  profiles: { full_name: string; email: string } | null;
  cars: { plate_number: string } | null;
  wash_packages: { name: string } | null;
  locations: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Activa",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  paused: {
    label: "Pausada",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  past_due: {
    label: "Pago vencido",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  trialing: {
    label: "Prueba",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  mercadopago: "MercadoPago",
  cash: "Efectivo",
  corporate: "Corporativo",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "paused", label: "Pausadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "past_due", label: "Vencidas" },
] as const;

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  useEffect(() => {
    async function fetchSubscriptions() {
      const { data } = await db
        .from("subscriptions")
        .select(
          "id, status, payment_provider, preferred_days, current_period_start, current_period_end, profiles:customer_id(full_name, email), cars(plate_number), wash_packages:package_id(name), locations:location_id(name)"
        )
        .order("created_at", { ascending: false });

      setSubscriptions((data || []) as AdminSubscriptionRow[]);
      setLoading(false);
    }

    fetchSubscriptions();
  }, []);

  const filtered =
    filter === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <p className="text-muted-foreground">
          Todas las suscripciones de clientes.
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                {subscriptions.filter(
                  (s) => s.status === opt.value
                ).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No hay suscripciones registradas."
                : "No hay suscripciones con este estado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
            return (
              <Card key={sub.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {sub.profiles?.full_name || "Sin nombre"}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sub.profiles?.email || "—"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {PROVIDER_LABELS[sub.payment_provider] ||
                        sub.payment_provider}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Car className="h-3.5 w-3.5" />
                      {sub.cars?.plate_number || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      {sub.wash_packages?.name || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {sub.locations?.name || "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
