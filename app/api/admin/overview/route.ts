import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/authServer";
import type { AdminAuditEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [users, hotels, reviews, managers, pendingVerif, pendingHotels, audit] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("hotels").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "manager"),
    supabase.from("manager_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("hotels").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(12),
  ]);

  return NextResponse.json({
    stats: {
      users: users.count ?? 0,
      hotels: hotels.count ?? 0,
      reviews: reviews.count ?? 0,
      managers: managers.count ?? 0,
    },
    pending: {
      verifications: pendingVerif.count ?? 0,
      hotels: pendingHotels.count ?? 0,
    },
    audit: (audit.data as AdminAuditEntry[] | null) ?? [],
  });
}
