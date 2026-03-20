// Server-side notification sender
// Creates notification row in DB

import { createAdminClient } from "@/lib/supabase/admin";
import { getNotificationContent } from "./templates";

interface SendNotificationParams {
  userId: string;
  type: string;
  data?: Record<string, string>;
  lang?: string;
}

export async function sendNotification({
  userId,
  type,
  data = {},
  lang = "es",
}: SendNotificationParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const content = getNotificationContent(type, data, lang);

  const { error } = await db.from("notifications").insert({
    user_id: userId,
    type,
    title: content.title,
    body: content.body,
    data,
  });

  if (error) {
    console.error("Failed to send notification:", error);
  }

  return { error };
}

export async function sendBulkNotifications(
  notifications: SendNotificationParams[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const rows = notifications.map(({ userId, type, data = {}, lang = "es" }) => {
    const content = getNotificationContent(type, data, lang);
    return {
      user_id: userId,
      type,
      title: content.title,
      body: content.body,
      data,
    };
  });

  const { error } = await db.from("notifications").insert(rows);
  if (error) {
    console.error("Failed to send bulk notifications:", error);
  }
  return { error };
}
