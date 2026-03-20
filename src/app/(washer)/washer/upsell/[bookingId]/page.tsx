"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMXN } from "@/lib/utils/currency";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/shared/image-upload";
import { ArrowLeft, Loader2, Send } from "lucide-react";

interface AddOnService {
  id: string;
  name: string;
  base_price: number;
  description: string | null;
}

export default function WasherUpsellPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params.bookingId as string;

  const [services, setServices] = useState<AddOnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  useEffect(() => {
    async function fetchAddOns() {
      const { data } = await db
        .from("service_catalog")
        .select("id, name, base_price, description")
        .eq("is_add_on", true)
        .order("name");

      setServices((data || []) as AddOnService[]);
      setLoading(false);
    }
    fetchAddOns();
  }, []);

  // Auto-fill price when service changes
  useEffect(() => {
    if (!selectedServiceId) return;
    const svc = services.find((s) => s.id === selectedServiceId);
    if (svc) {
      setPrice(svc.base_price);
    }
  }, [selectedServiceId, services]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  async function handleSubmit() {
    if (!user || !selectedServiceId || !selectedService) return;
    setSubmitting(true);

    try {
      // Create upsell_offer
      const { data: upsell, error: upsellError } = await db
        .from("upsell_offers")
        .insert({
          booking_id: bookingId,
          washer_id: user.id,
          service_name: selectedService.name,
          service_id: selectedServiceId,
          price,
          message,
          photo_url: photoUrl,
          status: "pending",
        })
        .select("id")
        .single();

      if (upsellError || !upsell) throw upsellError;

      // Create message with type upsell_offer
      await db.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content: `Servicio adicional: ${selectedService.name} - ${formatMXN(price)}`,
        message_type: "upsell_offer",
        metadata: { upsell_id: upsell.id },
      });

      router.push(`/washer/chat/${bookingId}`);
    } catch (err) {
      console.error("Error al crear oferta:", err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/washer/chat/${bookingId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Ofrecer servicio</h1>
          <p className="text-sm text-muted-foreground">
            Proponer un servicio adicional al cliente
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 py-4">
          {/* Service select */}
          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select
              value={selectedServiceId || undefined}
              onValueChange={(v) => v && setSelectedServiceId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    {svc.name} - {formatMXN(svc.base_price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedService.description}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Mensaje para el cliente</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explica al cliente por que recomiendas este servicio..."
              rows={3}
            />
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <Label>Foto de evidencia (opcional)</Label>
            <ImageUpload
              bucket="evidence-photos"
              path={`upsell/${bookingId}/${Date.now()}`}
              onUpload={(url) => setPhotoUrl(url)}
              currentUrl={photoUrl}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>Precio</Label>
            <Input
              type="number"
              min={0}
              step={10}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
            {price > 0 && (
              <p className="text-sm font-medium text-primary">
                {formatMXN(price)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!selectedServiceId || submitting}
      >
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Enviar oferta al cliente
      </Button>
    </div>
  );
}
