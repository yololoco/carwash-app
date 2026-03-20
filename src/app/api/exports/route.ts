import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminForAuth = createAdminClient() as any;
  const { data: profile } = await adminForAuth.from("profiles").select("role").eq("clerk_id", userId).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const reportType = req.nextUrl.searchParams.get("type") || "revenue";
  const startDate = req.nextUrl.searchParams.get("start") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const endDate = req.nextUrl.searchParams.get("end") || new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  if (reportType === "revenue") {
    const { data } = await db
      .from("payments")
      .select("created_at, amount, currency, status, payment_type, payment_method, payment_provider")
      .eq("status", "succeeded")
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59")
      .order("created_at", { ascending: false });
    rows = data || [];
    headers = ["fecha", "monto", "moneda", "estado", "tipo", "metodo", "proveedor"];
  } else if (reportType === "customers") {
    const { data } = await db
      .from("profiles")
      .select("full_name, email, phone, role, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });
    rows = data || [];
    headers = ["nombre", "email", "telefono", "rol", "fecha_registro"];
  } else if (reportType === "washers") {
    const { data } = await db
      .from("washer_profiles")
      .select("profiles(full_name, email), avg_rating, total_washes, avg_wash_duration_minutes, hourly_rate")
      .order("avg_rating", { ascending: false });
    rows = (data || []).map((r: { profiles: { full_name: string; email: string }; avg_rating: number; total_washes: number; avg_wash_duration_minutes: number; hourly_rate: number }) => ({
      nombre: r.profiles?.full_name,
      email: r.profiles?.email,
      rating: r.avg_rating,
      lavados: r.total_washes,
      duracion_promedio: r.avg_wash_duration_minutes,
      tarifa_hora: r.hourly_rate,
    }));
    headers = ["nombre", "email", "rating", "lavados", "duracion_promedio", "tarifa_hora"];
  }

  // Generate CSV
  const csvHeaders = headers.join(",");
  const csvRows = rows.map((row) =>
    headers.map((h) => {
      const val = row[h] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [csvHeaders, ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=mywash_${reportType}_${startDate}_${endDate}.csv`,
    },
  });
}
