import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("audit_log").insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_data: params.oldData || null,
      new_data: params.newData || null,
    });
  } catch (err) {
    console.error("Audit log error:", err);
    // Fire and forget — don't block main operations
  }
}
