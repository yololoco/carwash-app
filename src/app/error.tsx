"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-[var(--color-brand-warning)]" />
          <div>
            <h2 className="text-lg font-semibold">Algo salio mal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ocurrio un error inesperado. Por favor intenta de nuevo.
            </p>
          </div>
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
