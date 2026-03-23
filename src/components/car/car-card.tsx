"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, ChevronRight } from "lucide-react";

interface CarData {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  photo_url: string | null;
  parking_spot: string | null;
  is_active: boolean;
}

interface CarCardProps {
  car: CarData;
}

const COLOR_MAP: Record<string, string> = {
  blanco: "bg-white border border-gray-300",
  negro: "bg-gray-900",
  gris: "bg-gray-400",
  plata: "bg-gray-300",
  rojo: "bg-red-500",
  azul: "bg-blue-500",
  verde: "bg-green-500",
  amarillo: "bg-yellow-400",
  naranja: "bg-orange-500",
  cafe: "bg-amber-800",
  beige: "bg-amber-200",
  dorado: "bg-yellow-600",
  // English fallbacks
  white: "bg-white border border-gray-300",
  black: "bg-gray-900",
  gray: "bg-gray-400",
  silver: "bg-gray-300",
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  brown: "bg-amber-800",
  gold: "bg-yellow-600",
};

function getColorClass(color: string | null): string {
  if (!color) return "bg-muted";
  return COLOR_MAP[color.toLowerCase()] || "bg-muted";
}

export function CarCard({ car }: CarCardProps) {
  const makeModel = [car.make, car.model].filter(Boolean).join(" ");
  const details = [makeModel, car.year].filter(Boolean).join(" · ");

  return (
    <Link href={`/cars/${car.id}`} className="block">
      <Card className="card-hover glow-sm">
        <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          {/* Photo or car icon */}
          {car.photo_url ? (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14">
              <img
                src={car.photo_url}
                alt={car.plate_number}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-14 sm:w-14">
              <Car className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold tracking-wider sm:text-base">
                {car.plate_number}
              </p>
              {!car.is_active && (
                <Badge variant="secondary" className="shrink-0">
                  Inactivo
                </Badge>
              )}
            </div>
            {details && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {car.color && (
                  <span
                    className={`inline-block h-3 w-3 shrink-0 rounded-full ${getColorClass(car.color)}`}
                    title={car.color}
                  />
                )}
                <span className="truncate">{details}</span>
              </div>
            )}
            {car.parking_spot && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Cajon {car.parking_spot}</span>
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
