"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  minPhotos?: number;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  labels?: string[];
}

export default function PhotoCapture({
  minPhotos = 4,
  photos,
  onPhotosChange,
  labels = ["Frente", "Atras", "Izquierda", "Derecha"],
}: PhotoCaptureProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const slots = Math.max(minPhotos, labels.length);

  function handleCapture(index: number, file: File | undefined) {
    if (!file) return;
    const updated = [...photos];
    updated[index] = file;
    onPhotosChange(updated);
  }

  function handleRemove(index: number) {
    const updated = [...photos];
    updated[index] = undefined as unknown as File;
    onPhotosChange(updated.map((f) => f ?? (undefined as unknown as File)));
    if (inputRefs.current[index]) {
      inputRefs.current[index]!.value = "";
    }
  }

  const filledCount = photos.filter(Boolean).length;
  const isMissing = filledCount < minPhotos;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: slots }).map((_, i) => {
          const photo = photos[i];
          const label = labels[i] ?? `Foto ${i + 1}`;

          return (
            <div key={i} className="relative">
              {photo ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={label}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    className="absolute top-1 right-1"
                    onClick={() => handleRemove(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {label}
                  </span>
                </div>
              ) : (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 transition hover:border-primary/50 hover:bg-muted">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleCapture(i, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {isMissing && (
        <p className="text-center text-xs text-destructive">
          Se requieren al menos {minPhotos} fotos ({filledCount}/{minPhotos})
        </p>
      )}
    </div>
  );
}
