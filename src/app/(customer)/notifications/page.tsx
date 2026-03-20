"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { Bell, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "hace 1 dia";
  return `hace ${diffDays} dias`;
}

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (date >= todayStart) return "Hoy";
  if (date >= yesterdayStart) return "Ayer";
  return "Anteriores";
}

function getNotificationHref(notification: Notification): string | null {
  const data = notification.data;
  if (!data) return null;
  if (data.booking_id) return `/bookings/${data.booking_id}`;
  if (data.subscription_id) return `/subscriptions/${data.subscription_id}`;
  if (data.dispute_id) return `/disputes/${data.dispute_id}`;
  return null;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    const { data } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtime({
    table: "notifications",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onPayload: () => {
      fetchNotifications();
    },
  });

  const markAsRead = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const grouped = notifications.reduce<Record<string, Notification[]>>(
    (acc, n) => {
      const group = getDateGroup(n.created_at);
      if (!acc[group]) acc[group] = [];
      acc[group].push(n);
      return acc;
    },
    {}
  );

  const groupOrder = ["Hoy", "Ayer", "Anteriores"];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notificaciones</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Bell className="h-12 w-12" />
          <p className="text-sm">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder
            .filter((g) => grouped[g]?.length)
            .map((group) => (
              <section key={group}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {group}
                </h2>
                <div className="divide-y rounded-lg border bg-card">
                  {grouped[group].map((notification) => {
                    const href = getNotificationHref(notification);
                    const content = (
                      <div
                        className={cn(
                          "flex items-start gap-3 p-4 transition-colors",
                          !notification.is_read && "bg-primary/5",
                          href && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        {!notification.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <div
                          className={cn(
                            "flex-1 space-y-0.5",
                            notification.is_read && "ml-5"
                          )}
                        >
                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {timeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    );

                    if (href) {
                      return (
                        <Link key={notification.id} href={href} className="block">
                          {content}
                        </Link>
                      );
                    }

                    return <div key={notification.id}>{content}</div>;
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
