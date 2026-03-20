"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from "@/components/chat/message-bubble";
import UpsellCard from "@/components/chat/upsell-card";
import { ArrowLeft, Send, Loader2, Plus } from "lucide-react";

interface UpsellOffer {
  id: string;
  service_name: string;
  price: number;
  message: string;
  photo_url: string | null;
  status: string;
}

export default function WasherChatPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { user } = useAuth();
  const { messages, sendMessage, loading } = useChat(bookingId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [upsellOffers, setUpsellOffers] = useState<Record<string, UpsellOffer>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  // Fetch upsell offers referenced in messages
  useEffect(() => {
    const upsellMessages = messages.filter(
      (m) => m.message_type === "upsell_offer" && m.metadata?.upsell_id
    );

    const missingIds = upsellMessages
      .map((m) => m.metadata!.upsell_id as string)
      .filter((id) => !upsellOffers[id]);

    if (missingIds.length === 0) return;

    async function fetchUpsells() {
      const { data } = await db
        .from("upsell_offers")
        .select("id, service_name, price, message, photo_url, status")
        .in("id", missingIds);

      if (data) {
        const map: Record<string, UpsellOffer> = {};
        for (const offer of data as UpsellOffer[]) {
          map[offer.id] = offer;
        }
        setUpsellOffers((prev) => ({ ...prev, ...map }));
      }
    }

    fetchUpsells();
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setText("");
    await sendMessage(trimmed);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href={`/washer/bookings/${bookingId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Chat con cliente</h1>
          <p className="text-xs text-muted-foreground">
            Reservacion #{bookingId.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay mensajes aun. Envia el primero.
          </p>
        )}

        {messages.map((msg) => {
          if (msg.message_type === "upsell_offer" && msg.metadata?.upsell_id) {
            const offer = upsellOffers[msg.metadata.upsell_id as string];
            if (!offer) return null;
            return (
              <UpsellCard
                key={msg.id}
                offer={offer}
                isCustomer={false}
                onAccept={() => {}}
                onDecline={() => {}}
              />
            );
          }

          return (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              isOwn={msg.sender_id === user?.id}
              timestamp={msg.created_at}
              messageType={msg.message_type}
              metadata={msg.metadata as Record<string, unknown> | null}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + Upsell FAB */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Floating upsell button */}
      <Link
        href={`/washer/upsell/${bookingId}`}
        className={buttonVariants({
          className:
            "fixed right-4 bottom-20 z-40 shadow-lg gap-1.5",
        })}
      >
        <Plus className="h-4 w-4" />
        Ofrecer servicio
      </Link>
    </div>
  );
}
