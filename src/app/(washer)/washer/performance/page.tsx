"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Droplets, Clock, Gauge, Loader2, AlertCircle } from "lucide-react";

interface WasherProfile {
  avg_rating: number | null;
  total_washes: number;
  avg_wash_duration_minutes: number | null;
  material_efficiency_score: number | null;
}

export default function WasherPerformancePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WasherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data, error } = await db
        .from("washer_profiles")
        .select(
          "avg_rating, total_washes, avg_wash_duration_minutes, material_efficiency_score"
        )
        .eq("user_id", user!.id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mi desempeno</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Tu perfil de lavador no esta configurado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rating = profile?.avg_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi desempeno</h1>
        <p className="text-muted-foreground">
          Resumen de tu rendimiento como lavador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Star className="h-4 w-4" />
              Calificacion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rating.toFixed(1)}</div>
            <div className="mt-1 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < fullStars
                      ? "fill-yellow-400 text-yellow-400"
                      : i === fullStars && hasHalfStar
                        ? "fill-yellow-400/50 text-yellow-400"
                        : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total Washes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Droplets className="h-4 w-4" />
              Total de lavados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.total_washes ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">lavados completados</p>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Tiempo promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.avg_wash_duration_minutes != null
                ? `${profile.avg_wash_duration_minutes} min`
                : "N/A"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">por lavado</p>
          </CardContent>
        </Card>

        {/* Material Efficiency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Eficiencia material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.material_efficiency_score != null
                ? `${profile.material_efficiency_score}%`
                : "N/A"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">puntuacion</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
