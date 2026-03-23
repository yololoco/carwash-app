"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMXN } from "@/lib/utils/currency";
import {
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Banknote,
} from "lucide-react";

interface CuotaItem {
  id: string;
  washer_id: string;
  amount: number;
  status: string;
  date: string;
  confirmed_at: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

export default function ManagerCuotasPage() {
  const { profile } = useAuth();
  const [pendingCuotas, setPendingCuotas] = useState<CuotaItem[]>([]);
  const [paidCuotas, setPaidCuotas] = useState<CuotaItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchCuotas = useCallback(async () => {
    if (!profile) return;
    const db = createClient() as any;

    // Get manager's location(s)
    const { data: locData } = await db
      .from("location_staff")
      .select("location_id")
      .eq("staff_id", profile.id);

    if (!locData || locData.length === 0) {
      setLoaded(true);
      return;
    }

    const locationIds = locData.map((l: any) => l.location_id);

    // Pending cuotas
    const { data: pending } = await db
      .from("washer_cuotas")
      .select("*, profiles:washer_id(full_name, email)")
      .in("location_id", locationIds)
      .eq("date", today)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (pending) setPendingCuotas(pending);

    // Paid cuotas
    const { data: paid } = await db
      .from("washer_cuotas")
      .select("*, profiles:washer_id(full_name, email)")
      .in("location_id", locationIds)
      .eq("date", today)
      .eq("status", "paid")
      .order("confirmed_at", { ascending: false });

    if (paid) setPaidCuotas(paid);

    setLoaded(true);
  }, [profile, today]);

  useEffect(() => {
    fetchCuotas();
  }, [fetchCuotas]);

  // Realtime for cuota updates
  useRealtime({
    table: "washer_cuotas",
    event: "*",
    onPayload: () => {
      fetchCuotas();
    },
  });

  const handleConfirm = async (cuotaId: string) => {
    setConfirmingId(cuotaId);
    try {
      const res = await fetch("/api/cuotas/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuota_id: cuotaId }),
      });
      if (res.ok) {
        await fetchCuotas();
      }
    } catch {
      // Error handled silently
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold sm:text-2xl">Cuotas de hoy</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <Clock className="mb-1 h-5 w-5 text-yellow-600" />
            <p className="text-2xl font-bold">{pendingCuotas.length}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <CheckCircle2 className="mb-1 h-5 w-5 text-green-600" />
            <p className="text-2xl font-bold">{paidCuotas.length}</p>
            <p className="text-xs text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Cuotas */}
      {pendingCuotas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Pendientes de confirmacion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingCuotas.map((cuota) => (
              <div
                key={cuota.id}
                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50/50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {cuota.profiles?.full_name || "Lavador"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMXN(cuota.amount)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConfirm(cuota.id)}
                  disabled={confirmingId === cuota.id}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {confirmingId === cuota.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  Confirmar pago
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Paid Cuotas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Pagos confirmados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loaded && paidCuotas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Banknote className="h-8 w-8" />
              <p>Aun no hay pagos confirmados hoy.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paidCuotas.map((cuota) => (
                <div
                  key={cuota.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {cuota.profiles?.full_name || "Lavador"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMXN(cuota.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="border-transparent bg-green-100 text-green-800"
                    >
                      Pagado
                    </Badge>
                    {cuota.confirmed_at && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(cuota.confirmed_at).toLocaleTimeString(
                          "es-MX",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {!loaded && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
