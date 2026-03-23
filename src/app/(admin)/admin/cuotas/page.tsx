"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMXN } from "@/lib/utils/currency";
import {
  Banknote,
  Calendar,
  MapPin,
  User,
  Filter,
  Loader2,
} from "lucide-react";

interface CuotaRecord {
  id: string;
  washer_id: string;
  location_id: string;
  amount: number;
  status: string;
  date: string;
  confirmed_at: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
  locations: { name: string } | null;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function AdminCuotasPage() {
  const [cuotas, setCuotas] = useState<CuotaRecord[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterRange, setFilterRange] = useState<string>("today");

  // Revenue summaries
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const getDateRange = useCallback(
    (range: string) => {
      const now = new Date();
      let start: string;

      if (range === "today") {
        start = today;
      } else if (range === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split("T")[0];
      } else if (range === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split("T")[0];
      } else {
        start = "2020-01-01";
      }
      return { start, end: today };
    },
    [today]
  );

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      const db = createClient() as any;
      const { data } = await db
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setLocations(data);
    }
    fetchLocations();
  }, []);

  // Fetch revenue summaries
  useEffect(() => {
    async function fetchRevenue() {
      const db = createClient() as any;

      // Today
      const { data: todayData } = await db
        .from("washer_cuotas")
        .select("amount")
        .eq("date", today)
        .eq("status", "paid");
      setTodayRevenue(
        todayData?.reduce((s: number, c: any) => s + (c.amount || 0), 0) ?? 0
      );

      // This week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekData } = await db
        .from("washer_cuotas")
        .select("amount")
        .gte("date", weekAgo.toISOString().split("T")[0])
        .eq("status", "paid");
      setWeekRevenue(
        weekData?.reduce((s: number, c: any) => s + (c.amount || 0), 0) ?? 0
      );

      // This month
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { data: monthData } = await db
        .from("washer_cuotas")
        .select("amount")
        .gte("date", monthAgo.toISOString().split("T")[0])
        .eq("status", "paid");
      setMonthRevenue(
        monthData?.reduce((s: number, c: any) => s + (c.amount || 0), 0) ?? 0
      );
    }
    fetchRevenue();
  }, [today]);

  // Fetch cuotas with filters
  const fetchCuotas = useCallback(async () => {
    const db = createClient() as any;
    const { start, end } = getDateRange(filterRange);

    let query = db
      .from("washer_cuotas")
      .select(
        "*, profiles:washer_id(full_name), locations:location_id(name)"
      )
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    if (filterLocation !== "all") {
      query = query.eq("location_id", filterLocation);
    }

    const { data } = await query;
    if (data) setCuotas(data);
    setLoaded(true);
  }, [filterStatus, filterLocation, filterRange, getDateRange]);

  useEffect(() => {
    fetchCuotas();
  }, [fetchCuotas]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            variant="outline"
            className="border-transparent bg-green-100 text-green-800"
          >
            Pagado
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-transparent bg-yellow-100 text-yellow-800"
          >
            Pendiente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-transparent">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold sm:text-2xl">Cuotas</h1>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Hoy
            </p>
            <p className="text-lg font-bold text-green-600 sm:text-xl">
              {formatMXN(todayRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Esta semana
            </p>
            <p className="text-lg font-bold sm:text-xl">
              {formatMXN(weekRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Este mes
            </p>
            <p className="text-lg font-bold sm:text-xl">
              {formatMXN(monthRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select
              value={filterRange}
              onValueChange={(v) => v && setFilterRange(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Ultima semana</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterLocation}
              onValueChange={(v) => v && setFilterLocation(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ubicacion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(v) => v && setFilterStatus(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cuotas List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Pagos de cuota ({cuotas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cuotas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Banknote className="h-8 w-8" />
              <p>No se encontraron cuotas con estos filtros.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cuotas.map((cuota) => (
                <div
                  key={cuota.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {cuota.profiles?.full_name || "Lavador"}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(cuota.date + "T00:00:00").toLocaleDateString(
                            "es-MX",
                            { day: "numeric", month: "short" }
                          )}
                        </span>
                        {cuota.locations && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cuota.locations.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatMXN(cuota.amount)}
                    </span>
                    {statusBadge(cuota.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
