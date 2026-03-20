"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, Download } from "lucide-react";

interface WasherRow {
  id: string;
  full_name: string;
  total_washes: number;
  avg_rating: number;
  avg_wash_duration_minutes: number;
  material_efficiency_score: number;
}

type SortKey = "rating" | "washes";

export default function WashersAnalyticsPage() {
  const db = createClient() as any;

  const [washers, setWashers] = useState<WasherRow[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [loading, setLoading] = useState(true);

  const fetchWashers = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("washer_profiles")
      .select(
        "id, user_id, total_washes, avg_rating, avg_wash_duration_minutes, material_efficiency_score, profiles(full_name)"
      );

    if (data) {
      const rows: WasherRow[] = data.map((w: any) => ({
        id: w.id,
        full_name: w.profiles?.full_name ?? "Sin nombre",
        total_washes: w.total_washes ?? 0,
        avg_rating: w.avg_rating ?? 0,
        avg_wash_duration_minutes: w.avg_wash_duration_minutes ?? 0,
        material_efficiency_score: w.material_efficiency_score ?? 0,
      }));
      setWashers(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWashers();
  }, [fetchWashers]);

  const sorted = [...washers].sort((a, b) =>
    sortBy === "rating"
      ? b.avg_rating - a.avg_rating
      : b.total_washes - a.total_washes
  );

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push("★");
    if (half) stars.push("☆");
    return (
      <span className="text-yellow-500">
        {stars.join("")}{" "}
        <span className="text-muted-foreground">({rating.toFixed(1)})</span>
      </span>
    );
  }

  function handleExport() {
    const params = new URLSearchParams({ type: "washers" });
    window.open(`/api/exports?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Rendimiento de Lavadores</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Sort toggles */}
      <div className="flex gap-2">
        <Button
          variant={sortBy === "rating" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("rating")}
        >
          <Star className="mr-1 h-3 w-3" />
          Por calificacion
        </Button>
        <Button
          variant={sortBy === "washes" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("washes")}
        >
          Por total lavados
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((w) => (
            <Card key={w.id} size="sm">
              <CardHeader>
                <CardTitle className="text-sm">{w.full_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total lavados:</span>
                  <span className="font-medium">{w.total_washes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Calificacion:</span>
                  {renderStars(w.avg_rating)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Duracion prom. (min):
                  </span>
                  <span>{w.avg_wash_duration_minutes.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Eficiencia material:
                  </span>
                  <span>{w.material_efficiency_score.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {sorted.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              Sin lavadores registrados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
