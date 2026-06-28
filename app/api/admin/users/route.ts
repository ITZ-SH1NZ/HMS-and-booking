import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/authServer";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export type AdminUserRow = Pick<Profile, "id" | "full_name" | "role" | "phone" | "suspended" | "created_at">;

export async function GET(req: Request) {
  const { supabase, isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const role = params.get("role") ?? "all";

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, phone, suspended, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (role !== "all") query = query.eq("role", role);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: (data as AdminUserRow[] | null) ?? [] });
}
