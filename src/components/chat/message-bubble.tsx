"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  messageType: string;
  metadata: Record<string, unknown> | null;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function MessageBubble({
  content,
  isOwn,
  timestamp,
  messageType,
  metadata,
}: MessageBubbleProps) {
  // Upsell offers are rendered by the parent as UpsellCard
  if (messageType === "upsell_offer") return null;

  return (
    <div
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          isOwn
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
