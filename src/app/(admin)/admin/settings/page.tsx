"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Settings, Save } from "lucide-react";
import { toast } from "sonner";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  original_value: string;
}

const SETTING_LABELS: Record<string, string> = {
  overhead_per_wash: "Overhead por lavado ($)",
  late_cancellation_minutes: "Minutos para cancelacion tardia",
  max_emergency_per_day: "Max emergencias por dia",
  default_wash_duration_minutes: "Duracion de lavado por defecto (min)",
  no_show_limit: "Limite de no-shows",
  survey_delay_minutes: "Retraso de encuesta (min)",
  loyalty_points_per_wash: "Puntos de lealtad por lavado",
};

const SETTINGS_ORDER = [
  "overhead_per_wash",
  "late_cancellation_minutes",
  "max_emergency_per_day",
  "default_wash_duration_minutes",
  "no_show_limit",
  "survey_delay_minutes",
  "loyalty_points_per_wash",
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const { data } = await db
      .from("app_settings")
      .select("id, key, value")
      .is("location_id", null);

    const parsed = (data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      key: s.key as string,
      value: s.value as string,
      original_value: s.value as string,
    }));

    // Sort by predefined order
    parsed.sort((a: AppSetting, b: AppSetting) => {
      const ai = SETTINGS_ORDER.indexOf(a.key);
      const bi = SETTINGS_ORDER.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    setSettings(parsed as AppSetting[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateValue = (id: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value } : s))
    );
  };

  const hasChanges = settings.some((s) => s.value !== s.original_value);

  const handleSave = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const changed = settings.filter((s) => s.value !== s.original_value);

    for (const setting of changed) {
      await db
        .from("app_settings")
        .update({ value: setting.value })
        .eq("id", setting.id);
    }

    toast.success(`${changed.length} configuracion${changed.length > 1 ? "es" : ""} actualizada${changed.length > 1 ? "s" : ""}`);
    setSaving(false);
    fetchSettings();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes globales de la aplicacion
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Ajustes globales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay configuraciones globales
            </p>
          ) : (
            settings.map((setting) => (
              <div key={setting.id} className="space-y-1.5">
                <Label htmlFor={setting.key}>
                  {SETTING_LABELS[setting.key] ?? setting.key}
                </Label>
                <Input
                  id={setting.key}
                  value={setting.value}
                  onChange={(e) => updateValue(setting.id, e.target.value)}
                  className={
                    setting.value !== setting.original_value
                      ? "border-primary ring-1 ring-primary/30"
                      : ""
                  }
                />
              </div>
            ))
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
