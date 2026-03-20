"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onPayload: (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => void;
}

export function useRealtime({ table, filter, event = "*", onPayload }: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();

    const channelConfig: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(`realtime-${table}-${filter || "all"}`)
      .on(
        "postgres_changes" as never,
        channelConfig as never,
        (payload: unknown) => {
          onPayload(payload as { new: Record<string, unknown>; old: Record<string, unknown> });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event]);
}
