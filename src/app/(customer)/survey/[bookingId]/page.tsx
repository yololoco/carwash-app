"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import RatingStars from "@/components/shared/rating-stars";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface BookingData {
  id: string;
  scheduled_date: string;
  wash_session: {
    id: string;
    washer: { full_name: string };
  } | null;
  car: {
    plate_number: string;
    brand: string;
    model: string;
  };
}

interface EvidencePhoto {
  id: string;
  photo_url: string;
  photo_type: string;
}

export default function SurveyPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Survey fields
  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comments, setComments] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  // Dispute fields
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!bookingId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data: bookingData } = await db
      .from("bookings")
      .select(
        "id, scheduled_date, wash_session:wash_sessions(id, washer:profiles!wash_sessions_washer_id_fkey(full_name)), car:cars(plate_number, brand, model)"
      )
      .eq("id", bookingId)
      .single();

    if (bookingData) {
      setBooking({
        ...bookingData,
        wash_session: Array.isArray(bookingData.wash_session)
          ? bookingData.wash_session[0] ?? null
          : bookingData.wash_session,
        car: Array.isArray(bookingData.car)
          ? bookingData.car[0]
          : bookingData.car,
      });
    }

    const { data: photosData } = await db
      .from("evidence_photos")
      .select("id, photo_url, photo_type")
      .eq("booking_id", bookingId);

    setPhotos(photosData ?? []);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitSurvey = async () => {
    if (!user || !bookingId || overallRating === 0) return;
    setSubmitting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("quality_surveys").insert({
      booking_id: bookingId,
      customer_id: user.id,
      overall_rating: overallRating,
      cleanliness_rating: cleanlinessRating || null,
      timeliness_rating: timelinessRating || null,
      communication_rating: communicationRating || null,
      comments: comments || null,
      would_recommend: wouldRecommend,
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  const handleSubmitDispute = async () => {
    if (!user || !bookingId || !disputeSubject || !disputeDescription) return;
    setDisputeSubmitting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("disputes").insert({
      booking_id: bookingId,
      customer_id: user.id,
      subject: disputeSubject,
      description: disputeDescription,
      status: "open",
    });

    setDisputeSubmitting(false);
    setDisputeSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">Gracias por tu evaluacion</h2>
        <p className="text-sm text-muted-foreground">
          Tu opinion nos ayuda a mejorar el servicio.
        </p>

        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="mt-4 text-sm text-destructive underline underline-offset-4 hover:text-destructive/80"
              />
            }
          >
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Algo salio mal? Abrir disputa
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Abrir disputa</DialogTitle>
              <DialogDescription>
                Describe el problema que tuviste con este servicio.
              </DialogDescription>
            </DialogHeader>

            {disputeSubmitted ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm font-medium">Disputa enviada correctamente</p>
                <p className="text-xs text-muted-foreground">
                  Nos pondremos en contacto contigo pronto.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asunto</label>
                    <input
                      type="text"
                      value={disputeSubject}
                      onChange={(e) => setDisputeSubject(e.target.value)}
                      placeholder="Ej. Dano en el vehiculo"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descripcion</label>
                    <textarea
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="Describe con detalle lo que sucedio..."
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancelar
                  </DialogClose>
                  <Button
                    onClick={handleSubmitDispute}
                    disabled={
                      disputeSubmitting || !disputeSubject || !disputeDescription
                    }
                  >
                    {disputeSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enviar disputa
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const preWashPhotos = photos.filter((p) => p.photo_type === "pre_wash");
  const postWashPhotos = photos.filter((p) => p.photo_type === "post_wash");

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Evalua tu lavado</h1>
        {booking && (
          <p className="text-sm text-muted-foreground">
            {booking.car.brand} {booking.car.model} &middot;{" "}
            {booking.car.plate_number}
            {booking.wash_session?.washer?.full_name &&
              ` &middot; Lavador: ${booking.wash_session.washer.full_name}`}
          </p>
        )}
      </div>

      {/* Before/After Photos */}
      {(preWashPhotos.length > 0 || postWashPhotos.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Antes y despues
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Antes</p>
              {preWashPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt="Antes del lavado"
                  className="w-full rounded-lg border object-cover"
                />
              ))}
              {preWashPhotos.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground">
                  Sin fotos
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Despues</p>
              {postWashPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt="Despues del lavado"
                  className="w-full rounded-lg border object-cover"
                />
              ))}
              {postWashPhotos.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground">
                  Sin fotos
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Overall Rating */}
      <section className="space-y-2">
        <label className="text-sm font-medium">
          Calificacion general <span className="text-destructive">*</span>
        </label>
        <RatingStars value={overallRating} onChange={setOverallRating} size="lg" />
      </section>

      {/* Cleanliness Rating */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Limpieza</label>
        <RatingStars value={cleanlinessRating} onChange={setCleanlinessRating} />
      </section>

      {/* Timeliness Rating */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Puntualidad</label>
        <RatingStars value={timelinessRating} onChange={setTimelinessRating} />
      </section>

      {/* Communication Rating */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Comunicacion</label>
        <RatingStars
          value={communicationRating}
          onChange={setCommunicationRating}
        />
      </section>

      {/* Comments */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Comentarios</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Cuentanos tu experiencia..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </section>

      {/* Would Recommend */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Recomendarias myWash?</label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={wouldRecommend === true ? "default" : "outline"}
            className="flex-1"
            onClick={() => setWouldRecommend(true)}
          >
            Si
          </Button>
          <Button
            type="button"
            variant={wouldRecommend === false ? "default" : "outline"}
            className="flex-1"
            onClick={() => setWouldRecommend(false)}
          >
            No
          </Button>
        </div>
      </section>

      {/* Submit */}
      <Button
        onClick={handleSubmitSurvey}
        disabled={submitting || overallRating === 0}
        className="w-full"
        size="lg"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar evaluacion
      </Button>
    </div>
  );
}
