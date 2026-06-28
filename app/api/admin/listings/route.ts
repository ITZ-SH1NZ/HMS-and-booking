import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/authServer";
import type { Hotel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { supabase, isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";

  let query = supabase
    .from("hotels")
    .select("id, name, location, city, state, country, status, image_url, property_type, star_rating, created_at, rejection_reason, manager_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: (data as Partial<Hotel>[] | null) ?? [] });
}
