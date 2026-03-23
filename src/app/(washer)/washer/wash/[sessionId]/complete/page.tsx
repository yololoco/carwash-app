"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PhotoCapture from "@/components/wash/photo-capture";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Camera, FileText } from "lucide-react";

export default function CompleteWashPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const sessionId = params.sessionId as string;

  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [washerNotes, setWasherNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validPhotoCount = photos.filter(Boolean).length;
  const canProceedPhotos = validPhotoCount >= 4;

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);

    try {
      const db = createClient() as any;

      // a) Upload post-wash photos
      const validPhotos = photos.filter(Boolean);
      for (let i = 0; i < validPhotos.length; i++) {
        const filePath = `${sessionId}/post_wash/${i}.jpg`;
        await db.storage
          .from("evidence-photos")
          .upload(filePath, validPhotos[i], {
            contentType: validPhotos[i].type,
            upsert: true,
          });
      }

      // b) Insert evidence_photos rows
      const photoRows = validPhotos.map((_, i) => ({
        wash_session_id: sessionId,
        photo_type: "post_wash",
        storage_path: `${sessionId}/post_wash/${i}.jpg`,
        uploaded_by: user.id,
      }));
      if (photoRows.length > 0) {
        await db.from("evidence_photos").insert(photoRows);
      }

      // c) Calculate duration and update wash_session
      const { data: sessionData } = await db
        .from("wash_sessions")
        .select("started_at, booking_id")
        .eq("id", sessionId)
        .single();

      const now = new Date();
      let durationMinutes = 0;
      if (sessionData?.started_at) {
        const started = new Date(sessionData.started_at);
        durationMinutes = Math.round(
          (now.getTime() - started.getTime()) / 60000
        );
      }

      await db
        .from("wash_sessions")
        .update({
          completed_at: now.toISOString(),
          duration_minutes: durationMinutes,
          post_wash_photos_uploaded: true,
          washer_notes: washerNotes || null,
        })
        .eq("id", sessionId);

      // d) Update booking status to completed and calculate washer earnings
      if (sessionData?.booking_id) {
        // Fetch booking price info for earnings calculation
        const { data: bookingData } = await db
          .from("bookings")
          .select("total_price, commission_rate")
          .eq("id", sessionData.booking_id)
          .single();

        const totalPrice = bookingData?.total_price || 0;
        const commissionRate = bookingData?.commission_rate || 15;
        const commissionAmount = totalPrice * (commissionRate / 100);
        const washerEarnings = totalPrice - commissionAmount;

        await db
          .from("bookings")
          .update({
            status: "completed",
            completed_at: now.toISOString(),
            commission_amount: commissionAmount,
            washer_earnings: washerEarnings,
          })
          .eq("id", sessionData.booking_id);
      }

      // e) Navigate to requests with success
      router.push("/washer/requests?completed=true");
    } catch (err) {
      console.error("Error al finalizar lavado:", err);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/washer/wash/${sessionId}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver al lavado
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
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
          Paso {step} de 3
        </span>
      </div>

      {/* Step 1: Post-wash photos */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Fotos posteriores al lavado</h2>
          <p className="text-sm text-muted-foreground">
            Toma al menos 4 fotos del vehiculo despues del lavado para
            documentar el resultado.
          </p>

          <PhotoCapture
            minPhotos={4}
            photos={photos}
            onPhotosChange={setPhotos}
            labels={["Frente", "Atras", "Izquierda", "Derecha"]}
          />

          <Button
            className="w-full"
            disabled={!canProceedPhotos}
            onClick={() => setStep(2)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Step 2: Washer notes */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Notas del lavado</h2>
          <p className="text-sm text-muted-foreground">
            Agrega cualquier comentario sobre el lavado (opcional).
          </p>

          <Card>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Notas</Label>
                <Textarea
                  value={washerNotes}
                  onChange={(e) => setWasherNotes(e.target.value)}
                  placeholder="Observaciones sobre el lavado, estado del vehiculo, etc..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Atras
            </Button>
            <Button className="flex-1" onClick={() => setStep(3)}>
              {washerNotes.trim() ? "Siguiente" : "Omitir y continuar"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Final confirmation */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Finalizar lavado</h2>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Camera className="h-4 w-4" />
                Fotos posteriores
              </CardTitle>
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

          {washerNotes.trim() && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <FileText className="h-4 w-4" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{washerNotes}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
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
              Finalizar lavado
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
