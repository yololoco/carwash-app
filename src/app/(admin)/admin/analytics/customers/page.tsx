"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UserPlus, RefreshCw, Star, Download } from "lucide-react";

interface CustomerRow {
  id: string;
  full_name: string;
  email: string;
  total_spent: number;
  active_subs: number;
  last_booking: string | null;
}

export default function CustomersAnalyticsPage() {
  const db = createClient() as any;

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newThisMonth, setNewThisMonth] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [avgSatisfaction, setAvgSatisfaction] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Total customers
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "customer");

    const allCustomers = profiles ?? [];
    setTotalCustomers(allCustomers.length);

    // New this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const newCount = allCustomers.filter(
      (c: any) => new Date(c.created_at) >= firstOfMonth
    ).length;
    setNewThisMonth(newCount);

    // Active subscriptions count
    const { count: subCount } = await db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    setActiveSubs(subCount ?? 0);

    // Average satisfaction
    const { data: surveys } = await db
      .from("quality_surveys")
      .select("overall_rating");
    if (surveys && surveys.length > 0) {
      const avg =
        surveys.reduce((s: number, r: any) => s + r.overall_rating, 0) /
        surveys.length;
      setAvgSatisfaction(avg);
    }

    // Build customer list with totals
    const customerRows: CustomerRow[] = [];
    for (const c of allCustomers) {
      // Total spent
      const { data: payments } = await db
        .from("payments")
        .select("amount")
        .eq("user_id", c.id)
        .eq("status", "completed");
      const totalSpent = (payments ?? []).reduce(
        (s: number, p: any) => s + p.amount,
        0
      );

      // Active subs
      const { count: userSubs } = await db
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", c.id)
        .eq("status", "active");

      // Last booking
      const { data: lastBooking } = await db
        .from("bookings")
        .select("scheduled_date")
        .eq("customer_id", c.id)
        .order("scheduled_date", { ascending: false })
        .limit(1);

      customerRows.push({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        total_spent: totalSpent,
        active_subs: userSubs ?? 0,
        last_booking: lastBooking?.[0]?.scheduled_date ?? null,
      });
    }

    setCustomers(customerRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    const params = new URLSearchParams({ type: "customers" });
    window.open(`/api/exports?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analiticas de Clientes</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{totalCustomers}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              Nuevos este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{newThisMonth}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              Suscripciones activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{activeSubs}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              Satisfaccion prom.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{avgSatisfaction.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer list */}
      {loading ? (
        <p className="text-muted-foreground">Cargando clientes...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {customers.map((c) => (
            <Card key={c.id} size="sm">
              <CardHeader>
                <CardTitle className="text-sm">{c.full_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Gastado:</span>
                  <span className="font-medium">
                    {formatMXN(c.total_spent)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Suscripciones activas:
                  </span>
                  <span>{c.active_subs}</span>
                </div>
                {c.last_booking && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Ultima reserva:
                    </span>
                    <span>
                      {new Date(c.last_booking).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {customers.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              Sin clientes registrados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
