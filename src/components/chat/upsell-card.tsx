"use client";

import { formatMXN } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface UpsellOffer {
  id: string;
  service_name: string;
  price: number;
  message: string;
  photo_url: string | null;
  status: string;
}

interface UpsellCardProps {
  offer: UpsellOffer;
  isCustomer: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function UpsellCard({
  offer,
  isCustomer,
  onAccept,
  onDecline,
}: UpsellCardProps) {
  return (
    <Card className="mx-auto w-full max-w-[85%] overflow-hidden">
      {offer.photo_url && (
        <div className="h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.photo_url}
            alt={offer.service_name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{offer.service_name}</h4>
          <span className="text-sm font-bold text-primary">
            {formatMXN(offer.price)}
          </span>
        </div>

        {offer.message && (
          <p className="text-xs text-muted-foreground">{offer.message}</p>
        )}

        {offer.status === "pending" && isCustomer && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1" onClick={onAccept}>
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Aceptar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onDecline}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Rechazar
            </Button>
          </div>
        )}

        {offer.status === "accepted" && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Aceptado
          </Badge>
        )}

        {offer.status === "declined" && (
          <Badge variant="secondary">Rechazado</Badge>
        )}
      </CardContent>
    </Card>
  );
}
