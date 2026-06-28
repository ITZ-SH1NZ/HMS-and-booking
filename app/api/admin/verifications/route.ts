import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/authServer";
import type { ManagerVerification, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export type VerificationRow = ManagerVerification & { profiles: Pick<Profile, "full_name" | "phone"> | null };

export async function GET(req: Request) {
  const { supabase, isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";

  let query = supabase
    .from("manager_verifications")
    .select("*, profiles:profiles!manager_verifications_user_id_fkey(full_name, phone)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: (data as VerificationRow[] | null) ?? [] });
}
