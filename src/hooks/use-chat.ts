"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useChat(bookingId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  useEffect(() => {
    async function fetchMessages() {
      const { data } = await db
        .from("messages")
        .select("id, booking_id, sender_id, content, message_type, metadata, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      setMessages((data || []) as Message[]);
      setLoading(false);
    }

    fetchMessages();
  }, [bookingId]);

  useRealtime({
    table: "messages",
    filter: `booking_id=eq.${bookingId}`,
    event: "INSERT",
    onPayload: (payload) => {
      const newMsg = payload.new as unknown as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    },
  });

  const sendMessage = useCallback(
    async (content: string, messageType = "text", metadata: Record<string, unknown> | null = null) => {
      if (!user) return;

      await db.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content,
        message_type: messageType,
        metadata,
      });
    },
    [bookingId, user]
  );

  return { messages, sendMessage, loading };
}
