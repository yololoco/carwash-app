"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CarCard } from "@/components/car/car-card";
import { Car, Plus } from "lucide-react";

interface CarRow {
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

export default function CarsPage() {
  const { user, loading: authLoading } = useAuth();
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchCars() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;
      const { data } = await db
        .from("cars")
        .select(
          "id, plate_number, make, model, year, color, photo_url, parking_spot, is_active"
        )
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      setCars((data || []) as CarRow[]);
      setLoading(false);
    }

    fetchCars();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis autos</h1>
          <p className="text-muted-foreground">
            Administra tus vehiculos registrados.
          </p>
        </div>
        <Link href="/cars/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar auto
        </Link>
      </div>

      {cars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aun no tienes autos registrados.
            </p>
            <Link
              href="/cars/new"
              className={buttonVariants({ variant: "outline" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar tu primer auto
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
