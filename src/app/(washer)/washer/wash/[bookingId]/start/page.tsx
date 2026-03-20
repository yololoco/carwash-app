"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhotoCapture from "@/components/wash/photo-capture";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  ParkingSquare,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

interface BookingData {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  status: string;
  services: string[];
  car: {
    plate_number: string;
    make: string;
    model: string;
    color: string;
    photo_url: string | null;
    parking_spot: string | null;
  };
  location: {
    name: string;
  };
}

interface DamageEntry {
  description: string;
  severity: string;
  location_on_car: string;
}

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Menor" },
  { value: "moderate", label: "Moderado" },
  { value: "severe", label: "Severo" },
];

const LOCATION_OPTIONS = [
  { value: "Cofre", label: "Cofre" },
  { value: "Cajuela", label: "Cajuela" },
  { value: "Puerta izq delantera", label: "Puerta izq delantera" },
  { value: "Puerta izq trasera", label: "Puerta izq trasera" },
  { value: "Puerta der delantera", label: "Puerta der delantera" },
  { value: "Puerta der trasera", label: "Puerta der trasera" },
  { value: "Defensa delantera", label: "Defensa delantera" },
  { value: "Defensa trasera", label: "Defensa trasera" },
  { value: "Techo", label: "Techo" },
  { value: "Otro", label: "Otro" },
];

export default function WasherStartWashPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const bookingId = params.bookingId as string;

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: Photos
  const [photos, setPhotos] = useState<File[]>([]);

  // Step 3: Damages
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [newDamage, setNewDamage] = useState<DamageEntry>({
    description: "",
    severity: "minor",
    location_on_car: "Cofre",
  });

  useEffect(() => {
    if (!user) return;
    async function fetchBooking() {
      const db = createClient() as any;
      const { data } = await db
        .from("bookings")
        .select(
          "id, scheduled_date, scheduled_time_start, status, services, cars(plate_number, make, model, color, photo_url, parking_spot), locations(name)"
        )
        .eq("id", bookingId)
        .eq("assigned_washer_id", user!.id)
        .single();

      if (data) {
        setBooking({
          ...data,
          car: data.cars ?? {
            plate_number: "",
            make: "",
            model: "",
            color: "",
            photo_url: null,
            parking_spot: null,
          },
          location: data.locations ?? { name: "" },
          services: (data.services as string[]) ?? [],
        });
      }
      setLoading(false);
    }
    fetchBooking();
  }, [user, bookingId]);

  function addDamage() {
    if (!newDamage.description.trim()) return;
    setDamages((prev) => [...prev, { ...newDamage }]);
    setNewDamage({ description: "", severity: "minor", location_on_car: "Cofre" });
  }

  function removeDamage(index: number) {
    setDamages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!user || !booking) return;
    setSubmitting(true);

    try {
      const db = createClient() as any;

      // a) Create wash_session
      const { data: session, error: sessionError } = await db
        .from("wash_sessions")
        .insert({
          booking_id: booking.id,
          washer_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionError || !session) throw sessionError;

      const sessionId = session.id;

      // b) Upload photos to Supabase Storage
      const validPhotos = photos.filter(Boolean);
      for (let i = 0; i < validPhotos.length; i++) {
        const filePath = `${sessionId}/pre_wash/${i}.jpg`;
        await db.storage
          .from("evidence-photos")
          .upload(filePath, validPhotos[i], {
            contentType: validPhotos[i].type,
            upsert: true,
          });
      }

      // c) Insert evidence_photos rows
      const photoRows = validPhotos.map((_, i) => ({
        wash_session_id: sessionId,
        photo_type: "pre_wash",
        storage_path: `${sessionId}/pre_wash/${i}.jpg`,
        uploaded_by: user.id,
      }));
      if (photoRows.length > 0) {
        await db.from("evidence_photos").insert(photoRows);
      }

      // d) Insert damage_reports
      if (damages.length > 0) {
        const damageRows = damages.map((d) => ({
          wash_session_id: sessionId,
          description: d.description,
          severity: d.severity,
          location_on_car: d.location_on_car,
          reported_by: user.id,
        }));
        await db.from("damage_reports").insert(damageRows);
      }

      // e) Update booking status
      await db
        .from("bookings")
        .update({ status: "in_progress" })
        .eq("id", booking.id);

      // f) Update wash_session pre_wash_photos_uploaded
      await db
        .from("wash_sessions")
        .update({ pre_wash_photos_uploaded: true })
        .eq("id", sessionId);

      // g) Navigate to active wash page
      router.push(`/washer/wash/${sessionId}`);
    } catch (err) {
      console.error("Error al iniciar lavado:", err);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        <Link
          href="/washer/queue"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Link>
        <p className="text-center text-muted-foreground">
          Reservacion no encontrada.
        </p>
      </div>
    );
  }

  const validPhotoCount = photos.filter(Boolean).length;
  const canProceedPhotos = validPhotoCount >= 4;

  return (
    <div className="space-y-4">
      <Link
        href={`/washer/bookings/${bookingId}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver al detalle
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
        ))}
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          Paso {step} de 4
        </span>
      </div>

      {/* Step 1: Confirm car */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Confirmar vehiculo</h2>

          <Card>
            <CardContent className="space-y-3">
              {booking.car.photo_url ? (
                <div className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={booking.car.photo_url}
                    alt={`${booking.car.make} ${booking.car.model}`}
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold tracking-wider">
                  {booking.car.plate_number}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.car.make} {booking.car.model} - {booking.car.color}
              </p>
              {booking.car.parking_spot && (
                <div className="flex items-center gap-2 text-sm">
                  <ParkingSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    Cajon {booking.car.parking_spot}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {booking.location.name}
              </p>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => setStep(2)}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Vehiculo encontrado en su lugar
          </Button>
        </div>
      )}

      {/* Step 2: Pre-wash photos */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Fotos previas al lavado</h2>
          <p className="text-sm text-muted-foreground">
            Toma al menos 4 fotos del vehiculo desde diferentes angulos antes de
            iniciar el lavado.
          </p>

          <PhotoCapture
            minPhotos={4}
            photos={photos}
            onPhotosChange={setPhotos}
            labels={["Frente", "Atras", "Izquierda", "Derecha"]}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Atras
            </Button>
            <Button
              className="flex-1"
              disabled={!canProceedPhotos}
              onClick={() => setStep(3)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Damage documentation */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Documentar danos existentes</h2>
          <p className="text-sm text-muted-foreground">
            Registra cualquier dano existente en el vehiculo. Si no hay danos,
            puedes continuar.
          </p>

          {damages.length > 0 && (
            <div className="space-y-2">
              {damages.map((d, i) => (
                <Card key={i}>
                  <CardContent className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.location_on_car} &middot;{" "}
                        {SEVERITY_OPTIONS.find((s) => s.value === d.severity)
                          ?.label ?? d.severity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeDamage(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-base">
                <AlertTriangle className="h-4 w-4" />
                Agregar dano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Descripcion</Label>
                <Input
                  value={newDamage.description}
                  onChange={(e) =>
                    setNewDamage((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descripcion del dano..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Severidad</Label>
                  <Select
                    value={newDamage.severity}
                    onValueChange={(v) =>
                      v &&
                      setNewDamage((prev) => ({ ...prev, severity: v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ubicacion</Label>
                  <Select
                    value={newDamage.location_on_car}
                    onValueChange={(v) =>
                      v &&
                      setNewDamage((prev) => ({
                        ...prev,
                        location_on_car: v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={addDamage}
                disabled={!newDamage.description.trim()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar dano
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
            >
              Atras
            </Button>
            <Button className="flex-1" onClick={() => setStep(4)}>
              {damages.length === 0 ? "Sin danos, continuar" : "Siguiente"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review and start */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Revision final</h2>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vehiculo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {booking.car.make} {booking.car.model} - {booking.car.color}
              </p>
              <p className="text-sm font-bold">{booking.car.plate_number}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fotos previas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {photos.filter(Boolean).map((photo, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Danos registrados</CardTitle>
            </CardHeader>
            <CardContent>
              {damages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin danos registrados.
                </p>
              ) : (
                <ul className="space-y-1">
                  {damages.map((d, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{d.location_on_car}</span>:{" "}
                      {d.description} (
                      {SEVERITY_OPTIONS.find((s) => s.value === d.severity)
                        ?.label ?? d.severity}
                      )
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(3)}
            >
              Atras
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Iniciar lavado
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
