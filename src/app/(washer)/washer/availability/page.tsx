"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, CalendarDays } from "lucide-react";

interface AvailabilityDay {
  date: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  is_available: boolean;
  reason: string;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default function WasherAvailabilityPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reasonInput, setReasonInput] = useState<{ date: string; reason: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchAvailability() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      const next14: AvailabilityDay[] = [];
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        next14.push({
          date: dateStr,
          dayName: DAY_NAMES[d.getDay()],
          dayNumber: d.getDate(),
          monthName: MONTH_NAMES[d.getMonth()],
          is_available: true,
          reason: "",
        });
      }

      const startDate = next14[0].date;
      const endDate = next14[next14.length - 1].date;

      const { data } = await db
        .from("washer_availability")
        .select("date, is_available, reason")
        .eq("washer_id", user!.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (data) {
        const avMap = new Map(
          (data as { date: string; is_available: boolean; reason: string | null }[]).map(
            (a) => [a.date, a]
          )
        );
        for (const day of next14) {
          const record = avMap.get(day.date);
          if (record) {
            day.is_available = record.is_available;
            day.reason = record.reason ?? "";
          }
        }
      }

      setDays(next14);
      setLoading(false);
    }
    fetchAvailability();
  }, [user]);

  const toggleDay = (date: string) => {
    const day = days.find((d) => d.date === date);
    if (!day) return;

    if (day.is_available) {
      // Marking unavailable: show reason input
      setReasonInput({ date, reason: "" });
    } else {
      // Marking available: save immediately
      saveAvailability(date, true, "");
    }
  };

  const confirmUnavailable = () => {
    if (!reasonInput) return;
    saveAvailability(reasonInput.date, false, reasonInput.reason);
    setReasonInput(null);
  };

  const saveAvailability = async (
    date: string,
    isAvailable: boolean,
    reason: string
  ) => {
    if (!user) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("washer_availability").upsert(
      {
        washer_id: user.id,
        date,
        is_available: isAvailable,
        reason: isAvailable ? null : reason || null,
      },
      { onConflict: "washer_id,date" }
    );

    setDays((prev) =>
      prev.map((d) =>
        d.date === date ? { ...d, is_available: isAvailable, reason } : d
      )
    );
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi disponibilidad</h1>
        <p className="text-muted-foreground">
          Indica los dias que puedes trabajar en los proximos 14 dias.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => toggleDay(day.date)}
            disabled={saving}
            className={cn(
              "flex flex-col items-center rounded-lg border p-2 text-center transition-colors",
              day.is_available
                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
            )}
          >
            <span className="text-[10px] font-medium uppercase">
              {day.dayName}
            </span>
            <span className="text-lg font-bold">{day.dayNumber}</span>
            <span className="text-[10px]">{day.monthName}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30" />
          <span>No disponible</span>
        </div>
      </div>

      {/* Reason Input Modal */}
      {reasonInput && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>
                Marcar{" "}
                <strong>
                  {
                    days.find((d) => d.date === reasonInput.date)?.dayName
                  }{" "}
                  {
                    days.find((d) => d.date === reasonInput.date)?.dayNumber
                  }
                </strong>{" "}
                como no disponible
              </span>
            </div>
            <Input
              placeholder="Razon (opcional)"
              value={reasonInput.reason}
              onChange={(e) =>
                setReasonInput({ ...reasonInput, reason: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmUnavailable}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Confirmar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReasonInput(null)}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
