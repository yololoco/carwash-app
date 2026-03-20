"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PlateInput } from "@/components/car/plate-input";
import { ImageUpload } from "@/components/shared/image-upload";
import { ArrowLeft, Loader2, Save, Ban } from "lucide-react";

interface LocationOption {
  id: string;
  name: string;
}

export default function EditCarPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [primaryLocationId, setPrimaryLocationId] = useState("");
  const [parkingSpot, setParkingSpot] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [locations, setLocations] = useState<LocationOption[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setLocations((data || []) as LocationOption[]);
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function fetchCar() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data, error } = await db
        .from("cars")
        .select("*")
        .eq("id", carId)
        .eq("owner_id", user!.id)
        .single();

      if (error || !data) {
        router.push("/cars");
        return;
      }

      setPlateNumber(data.plate_number || "");
      setMake(data.make || "");
      setModel(data.model || "");
      setYear(data.year ? String(data.year) : "");
      setColor(data.color || "");
      setPhotoUrl(data.photo_url || null);
      setPrimaryLocationId(data.primary_location_id || "");
      setParkingSpot(data.parking_spot || "");
      setNotes(data.notes || "");
      setIsActive(data.is_active ?? true);
      setLoading(false);
    }

    fetchCar();
  }, [user, carId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const carData = {
      plate_number: plateNumber,
      make: make || null,
      model: model || null,
      year: year ? parseInt(year) : null,
      color: color || null,
      photo_url: photoUrl,
      primary_location_id: primaryLocationId || null,
      parking_spot: parkingSpot || null,
      notes: notes || null,
    };

    const { error } = await db
      .from("cars")
      .update(carData)
      .eq("id", carId)
      .eq("owner_id", user.id);

    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }

    router.push("/cars");
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setDeactivating(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { error } = await db
      .from("cars")
      .update({ is_active: false })
      .eq("id", carId)
      .eq("owner_id", user.id);

    if (error) {
      console.error(error);
      setDeactivating(false);
      return;
    }

    router.push("/cars");
  };

  if (authLoading || loading) {
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
          href="/cars"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Editar auto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plate & Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del vehiculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa *</Label>
              <PlateInput value={plateNumber} onChange={setPlateNumber} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="make">Marca</Label>
                <Input
                  id="make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Toyota"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Corolla"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  min="1990"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Blanco"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto del auto</Label>
              <ImageUpload
                bucket="car-photos"
                path={`${user?.id}/${carId}`}
                onUpload={setPhotoUrl}
                currentUrl={photoUrl}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Parking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ubicacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ubicacion principal</Label>
              <Select
                value={primaryLocationId}
                onValueChange={(v) => v && setPrimaryLocationId(v)}
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

            <div className="space-y-2">
              <Label htmlFor="parkingSpot">Cajon de estacionamiento</Label>
              <Input
                id="parkingSpot"
                value={parkingSpot}
                onChange={(e) => setParkingSpot(e.target.value)}
                placeholder="A-42"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales, nivel del estacionamiento, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={saving || !plateNumber}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>

          {isActive && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="w-full sm:w-auto"
            >
              {deactivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Desactivar auto
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
