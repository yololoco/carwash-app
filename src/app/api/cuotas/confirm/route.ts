import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: profile } = await db.from("profiles").select("id, role").eq("clerk_id", userId).single();
  if (!profile || !["admin", "location_manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { cuota_id } = await req.json();

  const { error } = await db.from("washer_cuotas").update({
    status: "paid",
    confirmed_by: profile.id,
    confirmed_at: new Date().toISOString(),
  }).eq("id", cuota_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
