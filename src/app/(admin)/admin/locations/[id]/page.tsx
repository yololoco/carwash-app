"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Trash2, Plus } from "lucide-react";
import type {
  Location,
  LocationType,
  LocationOperatingHours,
  LocationStaff,
  DayOfWeek,
  Profile,
} from "@/types/database";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miercoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sabado" },
  { value: "sunday", label: "Domingo" },
];

interface HoursRow {
  day_of_week: DayOfWeek;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";
  const locationId = isNew ? null : (params.id as string);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Location fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("office_building");
  const [maxCapacity, setMaxCapacity] = useState("30");
  const [minCarsThreshold, setMinCarsThreshold] = useState("5");
  const [isActive, setIsActive] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [parkingInstructions, setParkingInstructions] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [notes, setNotes] = useState("");

  // Operating hours
  const [hours, setHours] = useState<HoursRow[]>(
    DAYS.map((d) => ({
      day_of_week: d.value,
      open_time: "07:00",
      close_time: "18:00",
      is_closed: d.value === "saturday" || d.value === "sunday",
    }))
  );

  // Staff
  const [staff, setStaff] = useState<(LocationStaff & { profile?: Profile })[]>([]);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"location_manager" | "car_washer">("car_washer");
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");

  useEffect(() => {
    if (!locationId) return;
    async function fetchData() {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any;
      const locRes = await supabaseAny.from("locations").select("*").eq("id", locationId).single();
      const hoursRes = await supabaseAny
        .from("location_operating_hours")
        .select("*")
        .eq("location_id", locationId);
      const staffRes = await supabaseAny
        .from("location_staff")
        .select("*, profiles:user_id(id, full_name, email, role)")
        .eq("location_id", locationId);

      if (locRes.data) {
        const loc = locRes.data as Location;
        setName(loc.name);
        setAddress(loc.address);
        setCity(loc.city);
        setState(loc.state || "");
        setLocationType(loc.location_type);
        setMaxCapacity(String(loc.max_daily_capacity));
        setMinCarsThreshold(String(loc.min_cars_threshold || 5));
        setIsActive(loc.is_active);
        setContactName(loc.contact_name || "");
        setContactPhone(loc.contact_phone || "");
        setContactEmail(loc.contact_email || "");
        setParkingInstructions(loc.parking_instructions || "");
        setAccessInstructions(loc.access_instructions || "");
        setNotes(loc.notes || "");
      }

      if (hoursRes.data && hoursRes.data.length > 0) {
        const existing = hoursRes.data as LocationOperatingHours[];
        setHours(
          DAYS.map((d) => {
            const found = existing.find((h) => h.day_of_week === d.value);
            return found
              ? {
                  day_of_week: d.value,
                  open_time: found.open_time,
                  close_time: found.close_time,
                  is_closed: found.is_closed,
                }
              : {
                  day_of_week: d.value,
                  open_time: "07:00",
                  close_time: "18:00",
                  is_closed: true,
                };
          })
        );
      }

      if (staffRes.data) {
        setStaff(staffRes.data as unknown as (LocationStaff & { profile?: Profile })[]);
      }

      setLoading(false);
    }
    fetchData();
  }, [locationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const locationData = {
      name,
      address,
      city,
      state: state || null,
      country: "MX",
      location_type: locationType,
      max_daily_capacity: parseInt(maxCapacity),
      min_cars_threshold: parseInt(minCarsThreshold),
      is_active: isActive,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      parking_instructions: parkingInstructions || null,
      access_instructions: accessInstructions || null,
      notes: notes || null,
    };

    let savedLocationId = locationId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    if (isNew) {
      const { data, error } = await db
        .from("locations")
        .insert(locationData)
        .select("id")
        .single();
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
      savedLocationId = data.id;
    } else {
      const { error } = await db
        .from("locations")
        .update(locationData)
        .eq("id", locationId);
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
    }

    // Save operating hours (upsert)
    if (savedLocationId) {
      // Delete existing then insert
      await db
        .from("location_operating_hours")
        .delete()
        .eq("location_id", savedLocationId);

      const hoursData = hours.map((h) => ({
        location_id: savedLocationId!,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));

      await db.from("location_operating_hours").insert(hoursData);
    }

    setSaving(false);

    if (isNew && savedLocationId) {
      router.push(`/admin/locations/${savedLocationId}`);
    }
  };

  const handleAddStaff = async () => {
    if (!locationId || !staffEmail) return;
    setAddingStaff(true);
    setStaffError("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Find user by email
    const { data: userProfile } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("email", staffEmail.trim().toLowerCase())
      .single();

    if (!userProfile) {
      setStaffError("No se encontro un usuario con ese correo.");
      setAddingStaff(false);
      return;
    }

    const { error } = await db.from("location_staff").insert({
      location_id: locationId,
      user_id: userProfile.id,
      role: staffRole,
      is_active: true,
      is_primary: false,
    });

    if (error) {
      setStaffError(
        error.code === "23505"
          ? "Este usuario ya esta asignado a esta ubicacion."
          : error.message
      );
      setAddingStaff(false);
      return;
    }

    setStaff((prev) => [
      ...prev,
      {
        id: "",
        location_id: locationId,
        user_id: userProfile.id,
        role: staffRole,
        is_primary: false,
        is_active: true,
        assigned_at: new Date().toISOString(),
        profile: userProfile as unknown as Profile,
      },
    ]);
    setStaffEmail("");
    setAddingStaff(false);
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!locationId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db
      .from("location_staff")
      .delete()
      .eq("location_id", locationId)
      .eq("user_id", userId);
    setStaff((prev) => prev.filter((s) => s.user_id !== userId));
  };

  const updateHour = (index: number, field: keyof HoursRow, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/locations"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">
          {isNew ? "Nueva ubicacion" : name}
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacion general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Torre Reforma"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={locationType}
                  onValueChange={(v) => setLocationType(v as LocationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office_building">Edificio de oficinas</SelectItem>
                    <SelectItem value="residential_building">Edificio residencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Paseo de la Reforma 483"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ciudad de Mexico"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CDMX"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad diaria (autos)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  min="1"
                  required
                />
              </div>
              {locationType === "residential_building" && (
                <div className="space-y-2">
                  <Label htmlFor="threshold">Minimo de autos para servicio</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={minCarsThreshold}
                    onChange={(e) => setMinCarsThreshold(e.target.value)}
                    min="1"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Ubicacion activa</Label>
            </div>
          </CardContent>
        </Card>

        {/* Access & Parking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estacionamiento y acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parking">Instrucciones de estacionamiento</Label>
              <Textarea
                id="parking"
                value={parkingInstructions}
                onChange={(e) => setParkingInstructions(e.target.value)}
                placeholder="Nivel B1 y B2, cajones numerados..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access">Instrucciones de acceso</Label>
              <Textarea
                id="access"
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
                placeholder="Acceso por rampa lateral..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto del edificio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Carlos Martinez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefono</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@edificio.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horarios de operacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hours.map((h, i) => (
                <div
                  key={h.day_of_week}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-24 font-medium">
                    {DAYS[i].label}
                  </span>
                  <Switch
                    checked={!h.is_closed}
                    onCheckedChange={(checked) =>
                      updateHour(i, "is_closed", !checked)
                    }
                  />
                  {!h.is_closed ? (
                    <>
                      <Input
                        type="time"
                        value={h.open_time}
                        onChange={(e) =>
                          updateHour(i, "open_time", e.target.value)
                        }
                        className="w-28"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={h.close_time}
                        onChange={(e) =>
                          updateHour(i, "close_time", e.target.value)
                        }
                        className="w-28"
                      />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isNew ? "Crear ubicacion" : "Guardar cambios"}
        </Button>
      </form>

      {/* Staff Section (only for existing locations) */}
      {!isNew && locationId && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal asignado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing staff */}
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay personal asignado a esta ubicacion.
                </p>
              ) : (
                <div className="space-y-2">
                  {staff.map((s) => {
                    const p = s.profile || ({} as Profile);
                    return (
                      <div
                        key={s.user_id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {(p as unknown as { full_name?: string }).full_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(p as unknown as { email?: string }).email || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {s.role === "location_manager" ? "Manager" : "Lavador"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStaff(s.user_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add staff */}
              <Separator />
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Correo del usuario</Label>
                  <Input
                    type="email"
                    placeholder="usuario@correo.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                  />
                </div>
                <div className="w-36 space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={staffRole}
                    onValueChange={(v) =>
                      setStaffRole(v as "location_manager" | "car_washer")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car_washer">Lavador</SelectItem>
                      <SelectItem value="location_manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleAddStaff}
                  disabled={addingStaff || !staffEmail}
                >
                  {addingStaff ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {staffError && (
                <p className="text-sm text-destructive">{staffError}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
