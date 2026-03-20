"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Repeat,
  Pause,
  Play,
  XCircle,
  Loader2,
  Calendar,
  MapPin,
  Car,
  CheckCircle2,
} from "lucide-react";

interface SubscriptionRow {
  id: string;
  status: string;
  preferred_days: string[] | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string;
  wash_packages: { name: string } | null;
  cars: { plate_number: string; make: string | null; model: string | null } | null;
  locations: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  active: { label: "Activa", variant: "default", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  paused: { label: "Pausada", variant: "secondary", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  cancelled: { label: "Cancelada", variant: "destructive", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  past_due: { label: "Pago vencido", variant: "destructive", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  trialing: { label: "Prueba", variant: "secondary", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
};

const DAY_LABELS: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mie",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sab",
  sunday: "Dom",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionsContent />
    </Suspense>
  );
}

function SubscriptionsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "pause" | "resume" | "cancel";
    subId: string;
  }>({ open: false, action: "pause", subId: "" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  const fetchSubscriptions = async () => {
    if (!user) return;
    const { data } = await db
      .from("subscriptions")
      .select(
        "id, status, preferred_days, preferred_time_start, preferred_time_end, current_period_start, current_period_end, payment_provider, wash_packages(name), cars(plate_number, make, model), locations(name)"
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    setSubscriptions((data || []) as SubscriptionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) fetchSubscriptions();
  }, [user, authLoading]);

  const handleAction = async (
    action: "pause" | "resume" | "cancel",
    subId: string
  ) => {
    setActionLoading(subId);
    const updates: Record<string, unknown> = {};

    if (action === "pause") {
      updates.status = "paused";
      updates.paused_at = new Date().toISOString();
    } else if (action === "resume") {
      updates.status = "active";
      updates.paused_at = null;
    } else if (action === "cancel") {
      updates.status = "cancelled";
      updates.cancelled_at = new Date().toISOString();
    }

    await db.from("subscriptions").update(updates).eq("id", subId);
    setConfirmDialog({ open: false, action: "pause", subId: "" });
    await fetchSubscriptions();
    setActionLoading(null);
  };

  const openConfirm = (action: "pause" | "resume" | "cancel", subId: string) => {
    setConfirmDialog({ open: true, action, subId });
  };

  const CONFIRM_MESSAGES: Record<string, { title: string; desc: string; btn: string }> = {
    pause: {
      title: "Pausar suscripcion",
      desc: "Tu suscripcion sera pausada. No se programaran lavados hasta que la reanudes.",
      btn: "Pausar",
    },
    resume: {
      title: "Reanudar suscripcion",
      desc: "Tu suscripcion se reactivara y se programaran lavados nuevamente.",
      btn: "Reanudar",
    },
    cancel: {
      title: "Cancelar suscripcion",
      desc: "Tu suscripcion sera cancelada. Esta accion no se puede deshacer.",
      btn: "Cancelar suscripcion",
    },
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis suscripciones</h1>
        <p className="text-muted-foreground">
          Administra tus planes de lavado.
        </p>
      </div>

      {showSuccess && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Suscripcion creada exitosamente.
            </p>
          </CardContent>
        </Card>
      )}

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Repeat className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aun no tienes suscripciones activas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
            return (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{sub.wash_packages?.name || "Plan"}</CardTitle>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Car className="h-3.5 w-3.5" />
                      {sub.cars?.plate_number || "—"}
                      {sub.cars?.make && ` ${sub.cars.make}`}
                      {sub.cars?.model && ` ${sub.cars.model}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {sub.locations?.name || "—"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sub.preferred_days && sub.preferred_days.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sub.preferred_days.map((d) => (
                        <Badge key={d} variant="secondary">
                          {DAY_LABELS[d] || d}
                        </Badge>
                      ))}
                      {sub.preferred_time_start && sub.preferred_time_end && (
                        <Badge variant="outline">
                          {sub.preferred_time_start} - {sub.preferred_time_end}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(sub.current_period_start)} &mdash;{" "}
                    {formatDate(sub.current_period_end)}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  {sub.status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirm("pause", sub.id)}
                        disabled={actionLoading === sub.id}
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Pause className="mr-1 h-3.5 w-3.5" />
                        )}
                        Pausar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openConfirm("cancel", sub.id)}
                        disabled={actionLoading === sub.id}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </>
                  )}
                  {sub.status === "paused" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openConfirm("resume", sub.id)}
                        disabled={actionLoading === sub.id}
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3.5 w-3.5" />
                        )}
                        Reanudar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openConfirm("cancel", sub.id)}
                        disabled={actionLoading === sub.id}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogTitle>
            {CONFIRM_MESSAGES[confirmDialog.action]?.title}
          </DialogTitle>
          <DialogDescription>
            {CONFIRM_MESSAGES[confirmDialog.action]?.desc}
          </DialogDescription>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Volver</Button>
            </DialogClose>
            <Button
              variant={confirmDialog.action === "cancel" ? "destructive" : "default"}
              onClick={() =>
                handleAction(confirmDialog.action, confirmDialog.subId)
              }
              disabled={!!actionLoading}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {CONFIRM_MESSAGES[confirmDialog.action]?.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
