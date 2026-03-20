"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMXN } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, CreditCard, RefreshCw, Download } from "lucide-react";

interface RevenueData {
  total_revenue: number;
  subscription_revenue: number;
  one_time_revenue: number;
  total_payments: number;
  by_location: { location_name: string; amount: number }[];
}

export default function RevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);

    try {
      const res = await fetch(`/api/analytics/revenue?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  function handleExport() {
    const params = new URLSearchParams({ type: "revenue" });
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    window.open(`/api/exports?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analiticas de Ingresos</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="rev-start">Desde</Label>
          <Input
            id="rev-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rev-end">Hasta</Label>
          <Input
            id="rev-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Ingreso total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {formatMXN(data.total_revenue)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  Suscripciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {formatMXN(data.subscription_revenue)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Pago unico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {formatMXN(data.one_time_revenue)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Total pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{data.total_payments}</p>
              </CardContent>
            </Card>
          </div>

          {/* By location */}
          {data.by_location && data.by_location.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Desglose por ubicacion</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.by_location.map((loc) => (
                  <Card key={loc.location_name} size="sm">
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {loc.location_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">
                        {formatMXN(loc.amount)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">
          No se pudieron cargar los datos de ingresos.
        </p>
      )}
    </div>
  );
}
