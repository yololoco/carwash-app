"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  MapPin,
  Users,
  Car,
  DollarSign,
  TrendingUp,
  Droplets,
  CalendarCog,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stat {
  title: string;
  value: string;
  icon: LucideIcon;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  const [stats, setStats] = useState<Stat[]>([
    { title: "Ubicaciones activas", value: "—", icon: MapPin },
    { title: "Clientes", value: "—", icon: Users },
    { title: "Lavados hoy", value: "0", icon: Droplets },
    { title: "Lavados esta semana", value: "0", icon: Car },
    { title: "Ingresos del mes", value: "$0 MXN", icon: DollarSign },
    { title: "Tasa de satisfaccion", value: "—", icon: TrendingUp },
  ]);

  useEffect(() => {
    async function fetchStats() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      const [locRes, customerRes] = await Promise.all([
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "customer"),
      ]);

      setStats((prev) =>
        prev.map((s) => {
          if (s.title === "Ubicaciones activas")
            return { ...s, value: String(locRes.count ?? 0) };
          if (s.title === "Clientes")
            return { ...s, value: String(customerRes.count ?? 0) };
          return s;
        })
      );

      // Fetch locations for schedule generation
      const { data: locs } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true);
      setLocations((locs || []) as LocationOption[]);
      if (locs && locs.length > 0) setSelectedLocation(locs[0].id);
    }
    fetchStats();
  }, []);

  const handleGenerateSchedule = async () => {
    if (!selectedLocation) return;
    setGenerating(true);
    setGenResult(null);
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/scheduling/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: selectedLocation, date: today }),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.bookings_created !== undefined) {
      setGenResult(
        `${data.bookings_created} lavados creados, ${data.bookings_assigned} asignados` +
        (data.overflow_to_waitlist > 0 ? `, ${data.overflow_to_waitlist} en lista de espera` : "")
      );
    } else {
      setGenResult(data.error || "Error al generar");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Vista general de todas las operaciones de myWash.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCog className="h-4 w-4" />
            Generar agenda del dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <p className="text-sm text-muted-foreground">Ubicacion</p>
              <Select value={selectedLocation} onValueChange={(v) => v && setSelectedLocation(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona ubicacion" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="min-h-[44px] w-full sm:w-auto" onClick={handleGenerateSchedule} disabled={generating || !selectedLocation}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCog className="mr-2 h-4 w-4" />}
              Generar
            </Button>
          </div>
          {genResult && (
            <p className="text-sm text-muted-foreground">{genResult}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
