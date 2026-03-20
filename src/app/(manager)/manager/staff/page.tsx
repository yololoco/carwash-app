"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Star, Droplets, Mail } from "lucide-react";

interface StaffMember {
  user_id: string;
  full_name: string;
  email: string;
  avg_rating: number | null;
  total_washes: number;
  is_available: boolean;
}

export default function ManagerStaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchStaff() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      // Get manager's location
      const { data: locData } = await db
        .from("location_staff")
        .select("location_id")
        .eq("user_id", user!.id)
        .limit(1)
        .single();

      if (!locData) {
        setLoading(false);
        return;
      }

      setLocationId(locData.location_id);

      // Get washers at this location
      const { data: staffData } = await db
        .from("location_staff")
        .select(
          "user_id, profiles(full_name, email), washer_profiles(avg_rating, total_washes, is_available)"
        )
        .eq("location_id", locData.location_id)
        .eq("role", "car_washer");

      const mapped: StaffMember[] = (staffData ?? []).map(
        (s: Record<string, unknown>) => {
          const profile = s.profiles as {
            full_name: string;
            email: string;
          } | null;
          const washerProfile = s.washer_profiles as {
            avg_rating: number | null;
            total_washes: number;
            is_available: boolean;
          } | null;
          return {
            user_id: s.user_id as string,
            full_name: profile?.full_name ?? "Sin nombre",
            email: profile?.email ?? "",
            avg_rating: washerProfile?.avg_rating ?? null,
            total_washes: washerProfile?.total_washes ?? 0,
            is_available: washerProfile?.is_available ?? false,
          };
        }
      );

      setStaff(mapped);
      setLoading(false);
    }
    fetchStaff();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personal</h1>
        <p className="text-muted-foreground">
          Lavadores asignados a tu ubicacion.
        </p>
      </div>

      {!locationId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tienes una ubicacion asignada.
          </CardContent>
        </Card>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay lavadores asignados a tu ubicacion.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <Card key={member.user_id}>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{member.full_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                  <Badge
                    variant={member.is_available ? "default" : "secondary"}
                    className={
                      member.is_available
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : ""
                    }
                  >
                    {member.is_available ? "Disponible" : "No disponible"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    <span>
                      {member.avg_rating != null
                        ? member.avg_rating.toFixed(1)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="h-4 w-4" />
                    <span>{member.total_washes} lavados</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
