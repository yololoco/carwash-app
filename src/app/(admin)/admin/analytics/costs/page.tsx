"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface CostRecord {
  id: string;
  location_id: string;
  booking_id: string | null;
  revenue: number;
  labor_cost: number;
  material_cost: number;
  overhead_cost: number;
  total_cost: number;
  profit: number;
  margin_percentage: number;
  recorded_at: string;
  locations: { name: string } | null;
  bookings: { scheduled_date: string } | null;
}

export default function CostsAnalyticsPage() {
  const db = createClient() as any;

  const [records, setRecords] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = db
      .from("cost_records")
      .select("*, locations(name), bookings(scheduled_date)")
      .order("recorded_at", { ascending: false });

    if (startDate) query = query.gte("recorded_at", startDate);
    if (endDate) query = query.lte("recorded_at", endDate + "T23:59:59");

    const { data } = await query;
    if (data) setRecords(data);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalProfit = records.reduce((s, r) => s + r.profit, 0);
  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const totalCost = records.reduce((s, r) => s + r.total_cost, 0);
  const totalWashes = records.length;
  const avgMargin =
    totalWashes > 0
      ? records.reduce((s, r) => s + r.margin_percentage, 0) / totalWashes
      : 0;
  const avgCostPerWash = totalWashes > 0 ? totalCost / totalWashes : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analiticas de Costos</h1>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="cost-start">Desde</Label>
          <Input
            id="cost-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="cost-end">Hasta</Label>
          <Input
            id="cost-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              Margen prom.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Utilidad total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{formatMXN(totalProfit)}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total lavados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{totalWashes}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              Costo prom. lavado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{formatMXN(avgCostPerWash)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost records list */}
      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((r) => (
            <Card key={r.id} size="sm">
              <CardHeader>
                <CardTitle className="text-sm">
                  {r.locations?.name ?? "Sin ubicacion"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>
                    {r.bookings?.scheduled_date ??
                      new Date(r.recorded_at).toLocaleDateString("es-MX")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ingreso:</span>
                  <span>{formatMXN(r.revenue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Costo total:</span>
                  <span>{formatMXN(r.total_cost)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Utilidad:</span>
                  <span
                    className={
                      r.profit >= 0 ? "text-green-600" : "text-destructive"
                    }
                  >
                    {formatMXN(r.profit)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Margen:</span>
                  <Badge
                    variant={r.profit >= 0 ? "secondary" : "destructive"}
                  >
                    {r.margin_percentage.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {records.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              Sin registros de costos en el rango seleccionado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
