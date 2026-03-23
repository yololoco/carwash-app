"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMXN } from "@/lib/utils/currency";
import {
  DollarSign,
  Droplets,
  TrendingUp,
  Car,
  Calendar,
} from "lucide-react";

interface EarningItem {
  id: string;
  completed_at: string | null;
  created_at: string;
  total_price: number;
  commission_amount: number | null;
  washer_earnings: number;
  cars: { plate_number: string } | null;
}

export default function WasherEarningsPage() {
  const { profile } = useAuth();
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWashes, setTotalWashes] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    async function fetchEarnings() {
      const db = createClient() as any;

      const { data } = await db
        .from("bookings")
        .select(
          "id, completed_at, created_at, total_price, commission_amount, washer_earnings, cars(plate_number)"
        )
        .eq("washer_id", profile!.id)
        .eq("status", "completed")
        .eq("is_on_demand", true)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (data) {
        setEarnings(
          data.map((b: any) => ({
            ...b,
            cars: b.cars ?? { plate_number: "---" },
          }))
        );

        const total = data.reduce(
          (sum: number, b: any) => sum + (b.washer_earnings || 0),
          0
        );
        setTotalEarnings(total);
        setTotalWashes(data.length);
      }
      setLoaded(true);
    }
    fetchEarnings();
  }, [profile]);

  const avgPerWash = totalWashes > 0 ? totalEarnings / totalWashes : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Ganancias</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <DollarSign className="mb-1 h-5 w-5 text-green-600" />
            <p className="text-lg font-bold text-green-600 sm:text-xl">
              {formatMXN(totalEarnings)}
            </p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Total ganado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <Droplets className="mb-1 h-5 w-5 text-blue-600" />
            <p className="text-lg font-bold sm:text-xl">{totalWashes}</p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Total lavados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 pb-4">
            <TrendingUp className="mb-1 h-5 w-5 text-purple-600" />
            <p className="text-lg font-bold sm:text-xl">
              {formatMXN(avgPerWash)}
            </p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Prom/lavado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Washes List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Lavados recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loaded && earnings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Droplets className="h-8 w-8" />
              <p>Aun no tienes lavados completados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {earnings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {item.cars?.plate_number}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          item.completed_at || item.created_at
                        ).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {formatMXN(item.washer_earnings)}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
                      <span>Total: {formatMXN(item.total_price)}</span>
                      {item.commission_amount != null && (
                        <span>
                          Com: {formatMXN(item.commission_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
