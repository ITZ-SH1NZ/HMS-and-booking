import { NextResponse } from "next/server";
import { getManagerContext } from "@/lib/authServer";
import type { StaffPermission } from "@/lib/types";
import type { AssignmentRow, StaffMember, InviteRow } from "@/app/manager/staff/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hotels } = await supabase
    .from("hotels")
    .select("id, name, location, image_url")
    .eq("manager_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const hotelList = (hotels as { id: string; name: string }[] | null) ?? [];
  const nameById = new Map(hotelList.map((h) => [h.id, h.name]));
  const hotelIds = hotelList.map((h) => h.id);

  const [{ data: assignments }, { data: invites }] = await Promise.all([
    hotelIds.length
      ? supabase.from("hotel_staff").select("id, hotel_id, email, permissions").in("hotel_id", hotelIds)
      : Promise.resolve({ data: [] as { id: string; hotel_id: string; email: string | null; permissions: StaffPermission[] }[] }),
    hotelIds.length
      ? supabase
          .from("staff_invites")
          .select("id, email, hotel_id, permissions, token, expires_at")
          .in("hotel_id", hotelIds)
          .eq("status", "pending")
      : Promise.resolve({ data: [] as { id: string; email: string; hotel_id: string; permissions: StaffPermission[]; token: string; expires_at: string }[] }),
  ]);

  const byEmail = new Map<string, StaffMember>();
  for (const a of assignments ?? []) {
    const key = a.email ?? a.id;
    const member: StaffMember = byEmail.get(key) ?? { email: a.email ?? "Unknown", assignments: [] };
    member.assignments.push({
      id: a.id,
      hotelId: a.hotel_id,
      hotelName: nameById.get(a.hotel_id) ?? "Hotel",
      permissions: a.permissions ?? [],
    } satisfies AssignmentRow);
    byEmail.set(key, member);
  }

  const staff = Array.from(byEmail.values());
  const inviteRows: InviteRow[] = (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    hotelId: i.hotel_id,
    hotelName: nameById.get(i.hotel_id) ?? "Hotel",
    permissions: i.permissions ?? [],
    token: i.token,
    expiresAt: i.expires_at,
  }));

  return NextResponse.json({ hotels: hotelList, staff, invites: inviteRows });
}
