"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { BookingStatus } from "@/components/booking/booking-status";
import WashTimer from "@/components/wash/wash-timer";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  AlertTriangle,
  Clock,
  Camera,
} from "lucide-react";

interface BookingData {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time_start: string;
  assigned_washer_id: string | null;
  washer_name: string | null;
}

interface EvidencePhoto {
  id: string;
  photo_type: string;
  storage_path: string;
  url?: string;
}

interface DamageReport {
  id: string;
  description: string;
  severity: string;
  location_on_car: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Programado" },
  { key: "confirmed", label: "Confirmado" },
  { key: "washer_en_route", label: "En camino" },
  { key: "in_progress", label: "Lavando" },
  { key: "completed", label: "Completado" },
];

const SEVERITY_LABELS: Record<string, string> = {
  minor: "Menor",
  moderate: "Moderado",
  severe: "Severo",
};

export default function CustomerTrackingPage() {
  const params = useParams();
  const { user } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [washSession, setWashSession] = useState<{
    id: string;
    started_at: string;
  } | null>(null);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time subscription
  useRealtime({
    table: "bookings",
    filter: `id=eq.${bookingId}`,
    event: "UPDATE",
    onPayload: (p) =>
      setBooking((prev) => (prev ? { ...prev, ...p.new } : prev)),
  });

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const db = createClient() as any;

      // Fetch booking
      const { data: bookingData } = await db
        .from("bookings")
        .select(
          "id, status, scheduled_date, scheduled_time_start, assigned_washer_id"
        )
        .eq("id", bookingId)
        .eq("customer_id", user!.id)
        .single();

      if (!bookingData) {
        setLoading(false);
        return;
      }

      // Fetch washer name
      let washerName: string | null = null;
      if (bookingData.assigned_washer_id) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", bookingData.assigned_washer_id)
          .single();
        washerName = profile?.full_name ?? null;
      }

      setBooking({ ...bookingData, washer_name: washerName });

      // Fetch wash session if in_progress or completed
      if (
        bookingData.status === "in_progress" ||
        bookingData.status === "completed"
      ) {
        const { data: sessionData } = await db
          .from("wash_sessions")
          .select("id, started_at")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (sessionData) {
          setWashSession(sessionData);

          // Fetch evidence photos
          const { data: evidencePhotos } = await db
            .from("evidence_photos")
            .select("id, photo_type, storage_path")
            .eq("wash_session_id", sessionData.id);

          if (evidencePhotos) {
            // Get public URLs
            const withUrls = evidencePhotos.map(
              (photo: { id: string; photo_type: string; storage_path: string }) => {
                const {
                  data: { publicUrl },
                } = db.storage
                  .from("evidence-photos")
                  .getPublicUrl(photo.storage_path);
                return { ...photo, url: publicUrl };
              }
            );
            setPhotos(withUrls);
          }

          // Fetch damage reports
          const { data: damageData } = await db
            .from("damage_reports")
            .select("id, description, severity, location_on_car")
            .eq("wash_session_id", sessionData.id);

          if (damageData) {
            setDamages(damageData);
          }
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [user, bookingId]);

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
          href="/bookings"
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

  // Determine which step is active
  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.key === booking.status
  );

  const preWashPhotos = photos.filter((p) => p.photo_type === "pre_wash");
  const postWashPhotos = photos.filter((p) => p.photo_type === "post_wash");

  return (
    <div className="space-y-4">
      <Link
        href="/bookings"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Mis reservaciones
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Seguimiento</h1>
        <BookingStatus status={booking.status} />
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="py-4">
          <div className="relative ml-3">
            {STATUS_STEPS.map((step, index) => {
              const isPast = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div key={step.key} className="relative flex items-start pb-6 last:pb-0">
                  {/* Vertical line */}
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[7px] top-4 h-full w-0.5 ${
                        isPast
                          ? "bg-green-500"
                          : isCurrent
                            ? "bg-green-500/30"
                            : "bg-muted"
                      }`}
                    />
                  )}

                  {/* Dot */}
                  <div
                    className={`relative z-10 mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                      isPast
                        ? "border-green-500 bg-green-500"
                        : isCurrent
                          ? "border-primary bg-primary animate-pulse"
                          : "border-muted bg-background"
                    }`}
                  />

                  {/* Label */}
                  <span
                    className={`ml-3 text-sm font-medium ${
                      isPast
                        ? "text-green-600 dark:text-green-400"
                        : isCurrent
                          ? "text-foreground font-bold"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Washer info */}
      {booking.washer_name && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                Lavador: <strong>{booking.washer_name}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer for in_progress */}
      {booking.status === "in_progress" && washSession && (
        <Card>
          <CardContent className="py-6">
            <WashTimer startedAt={washSession.started_at} />
          </CardContent>
        </Card>
      )}

      {/* Before/After photos for completed */}
      {booking.status === "completed" &&
        (preWashPhotos.length > 0 || postWashPhotos.length > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Camera className="h-4 w-4" />
                Fotos del lavado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preWashPhotos.length > 0 && postWashPhotos.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Antes y despues
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-center text-xs font-medium text-muted-foreground">
                        Antes
                      </p>
                      <div className="space-y-2">
                        {preWashPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="aspect-[4/3] overflow-hidden rounded-lg border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt="Antes del lavado"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-center text-xs font-medium text-muted-foreground">
                        Despues
                      </p>
                      <div className="space-y-2">
                        {postWashPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="aspect-[4/3] overflow-hidden rounded-lg border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt="Despues del lavado"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square overflow-hidden rounded-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt="Foto del lavado"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Survey link placeholder */}
      {booking.status === "completed" && (
        <Button className="w-full" disabled>
          Encuesta de satisfaccion (proximamente)
        </Button>
      )}

      {/* Damage reports */}
      {damages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-base">
              <AlertTriangle className="h-4 w-4" />
              Danos reportados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {damages.map((damage) => (
              <div
                key={damage.id}
                className="rounded-lg border p-3"
              >
                <p className="text-sm font-medium">{damage.description}</p>
                <p className="text-xs text-muted-foreground">
                  {damage.location_on_car} &middot;{" "}
                  {SEVERITY_LABELS[damage.severity] ?? damage.severity}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
