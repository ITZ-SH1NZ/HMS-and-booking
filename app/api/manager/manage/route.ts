import { NextResponse } from "next/server";
import { getManagerContext } from "@/lib/authServer";
import type { UserRole } from "@/lib/types";
import type { PickerHotel } from "@/app/manager/manage/types";

export const dynamic = "force-dynamic";

type HotelLite = { id: string; name: string; location: string };

export async function GET() {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const role = (profile?.role as UserRole) ?? "guest";

  let hotels: HotelLite[] = [];
  if (role === "staff") {
    const { data } = await supabase
      .from("hotel_staff")
      .select("hotels(id, name, location)")
      .eq("staff_id", userId);
    hotels = ((data ?? []) as { hotels: HotelLite | HotelLite[] | null }[]).flatMap((r) =>
      r.hotels ? (Array.isArray(r.hotels) ? r.hotels : [r.hotels]) : [],
    );
  } else {
    const { data } = await supabase
      .from("hotels")
      .select("id, name, location")
      .eq("manager_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    hotels = (data as HotelLite[] | null) ?? [];
  }

  // Local calendar date (not UTC) so "today" matches the booking dates.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const ids = hotels.map((h) => h.id);
  const ACTIVE = ["pending", "confirmed", "checked_in"];
  const { data: bookings } = ids.length
    ? await supabase
        .from("bookings")
        .select("hotel_id, num_rooms, guest_count, check_in, check_out, status")
        .in("hotel_id", ids)
        .in("status", ACTIVE)
        .gte("check_out", today)
    : { data: [] as { hotel_id: string; num_rooms: number; guest_count: number; check_in: string; check_out: string; status: string }[] };

  const stats = new Map<string, { arrivals: number; departures: number; inHouse: number }>();
  for (const b of bookings ?? []) {
    const s = stats.get(b.hotel_id) ?? { arrivals: 0, departures: 0, inHouse: 0 };
    if (b.check_in === today) s.arrivals += b.num_rooms;
    if (b.check_out === today) s.departures += b.num_rooms;
    if (b.check_in <= today && today < b.check_out) s.inHouse += b.guest_count;
    stats.set(b.hotel_id, s);
  }

  const result: PickerHotel[] = hotels.map((h) => ({
    ...h,
    arrivals: stats.get(h.id)?.arrivals ?? 0,
    departures: stats.get(h.id)?.departures ?? 0,
    inHouse: stats.get(h.id)?.inHouse ?? 0,
  }));

  return NextResponse.json({ role, hotels: result });
}
