"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Users,
  Star,
  MapPin,
  Mail,
  Plus,
  UserPlus,
} from "lucide-react";

interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avg_rating: number | null;
  total_washes: number;
  locations: string[];
}

interface Location {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  car_washer: "Lavador",
  location_manager: "Gerente",
};

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formDetailing, setFormDetailing] = useState(false);
  const [formCeramic, setFormCeramic] = useState(false);
  const [formLocationId, setFormLocationId] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Fetch staff users (car_washer + location_manager)
    const { data: profilesData } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["car_washer", "location_manager"]);

    const userIds = (profilesData ?? []).map(
      (p: { id: string }) => p.id
    );

    // Fetch washer profiles
    let washerMap = new Map<
      string,
      { avg_rating: number | null; total_washes: number }
    >();
    if (userIds.length > 0) {
      const { data: washerData } = await db
        .from("washer_profiles")
        .select("user_id, avg_rating, total_washes")
        .in("user_id", userIds);
      washerMap = new Map(
        (washerData ?? []).map(
          (w: {
            user_id: string;
            avg_rating: number | null;
            total_washes: number;
          }) => [w.user_id, { avg_rating: w.avg_rating, total_washes: w.total_washes }]
        )
      );
    }

    // Fetch location_staff with location names
    let locationMap = new Map<string, string[]>();
    if (userIds.length > 0) {
      const { data: locStaffData } = await db
        .from("location_staff")
        .select("user_id, locations(name)")
        .in("user_id", userIds);
      for (const ls of locStaffData ?? []) {
        const userId = (ls as Record<string, unknown>).user_id as string;
        const locName =
          ((ls as Record<string, unknown>).locations as { name: string } | null)
            ?.name ?? "";
        if (!locationMap.has(userId)) {
          locationMap.set(userId, []);
        }
        if (locName) {
          locationMap.get(userId)!.push(locName);
        }
      }
    }

    const mapped: StaffUser[] = (profilesData ?? []).map(
      (p: { id: string; full_name: string; email: string; role: string }) => {
        const wp = washerMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          avg_rating: wp?.avg_rating ?? null,
          total_washes: wp?.total_washes ?? 0,
          locations: locationMap.get(p.id) ?? [],
        };
      }
    );

    setStaffList(mapped);

    // Fetch all locations for the form
    const { data: locData } = await db
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    setLocations(locData ?? []);
    setLoading(false);
  }

  const handleCreateWasher = async () => {
    setFormError("");
    if (!formEmail.trim()) {
      setFormError("El email es obligatorio.");
      return;
    }

    setFormSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Find user by email
    const { data: userProfile } = await db
      .from("profiles")
      .select("id")
      .eq("email", formEmail.trim())
      .single();

    if (!userProfile) {
      setFormError("No se encontro un usuario con ese email.");
      setFormSaving(false);
      return;
    }

    const skills: string[] = [];
    if (formDetailing) skills.push("detailing");
    if (formCeramic) skills.push("ceramic");

    // Create washer_profile
    const { error: wpError } = await db.from("washer_profiles").upsert(
      {
        user_id: userProfile.id,
        hourly_rate: formHourlyRate ? parseFloat(formHourlyRate) : 0,
        skills,
        is_available: true,
      },
      { onConflict: "user_id" }
    );

    if (wpError) {
      setFormError("Error al crear perfil de lavador.");
      setFormSaving(false);
      return;
    }

    // Update user role to car_washer
    await db
      .from("profiles")
      .update({ role: "car_washer" })
      .eq("id", userProfile.id);

    // Assign to location if selected
    if (formLocationId) {
      await db.from("location_staff").upsert(
        {
          user_id: userProfile.id,
          location_id: formLocationId,
          role: "car_washer",
        },
        { onConflict: "user_id,location_id" }
      );
    }

    // Reset form & refresh
    setFormEmail("");
    setFormHourlyRate("");
    setFormDetailing(false);
    setFormCeramic(false);
    setFormLocationId("");
    setDialogOpen(false);
    setFormSaving(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personal</h1>
          <p className="text-muted-foreground">
            Administra lavadores y gerentes del sistema.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Agregar lavador
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear perfil de lavador</DialogTitle>
              <DialogDescription>
                Busca un usuario por email y configura su perfil de lavador.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email del usuario</Label>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tarifa por hora (MXN)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formHourlyRate}
                  onChange={(e) => setFormHourlyRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Habilidades</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formDetailing}
                      onChange={(e) => setFormDetailing(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Detailing
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formCeramic}
                      onChange={(e) => setFormCeramic(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Ceramic
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Asignar a ubicacion</Label>
                <Select
                  value={formLocationId || undefined}
                  onValueChange={(v) => v && setFormLocationId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar ubicacion" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateWasher}
                disabled={formSaving}
              >
                {formSaving && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                <UserPlus className="mr-1 h-4 w-4" />
                Crear lavador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {staffList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay personal registrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staffList.map((member) => (
            <Card key={member.id}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{member.full_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      member.role === "car_washer"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                    }
                  >
                    {ROLE_LABELS[member.role] ?? member.role}
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
                  {member.role === "car_washer" && (
                    <span>{member.total_washes} lavados</span>
                  )}
                </div>

                {member.locations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {member.locations.map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        <MapPin className="h-3 w-3" />
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
