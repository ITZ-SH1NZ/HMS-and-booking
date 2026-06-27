import { NextResponse } from "next/server";
import { getManagerContext } from "@/lib/authServer";
import type { Hotel } from "@/lib/types";
import type { ManagerHotelCard } from "@/app/manager/hotels/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("hotels")
    .select("*")
    .eq("manager_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const hotels = (data as Hotel[] | null) ?? [];
  const hotelIds = hotels.map((h) => h.id);

  const { data: rooms } = hotelIds.length
    ? await supabase.from("rooms").select("id, hotel_id, total_units").in("hotel_id", hotelIds)
    : { data: [] as { id: string; hotel_id: string; total_units: number }[] };

  const roomsByHotel = new Map<string, { count: number; capacity: number }>();
  const hotelByRoom = new Map<string, string>();
  for (const r of rooms ?? []) {
    hotelByRoom.set(r.id, r.hotel_id);
    const e = roomsByHotel.get(r.hotel_id) ?? { count: 0, capacity: 0 };
    e.count += 1;
    e.capacity += r.total_units ?? 0;
    roomsByHotel.set(r.hotel_id, e);
  }

  const today = new Date().toISOString().slice(0, 10);
  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: inv } = roomIds.length
    ? await supabase.from("room_inventory").select("room_id, booked_count").eq("date", today).in("room_id", roomIds)
    : { data: [] as { room_id: string; booked_count: number }[] };

  const occupiedByHotel = new Map<string, number>();
  for (const row of inv ?? []) {
    const hid = hotelByRoom.get(row.room_id);
    if (!hid) continue;
    occupiedByHotel.set(hid, (occupiedByHotel.get(hid) ?? 0) + (row.booked_count ?? 0));
  }

  const cards: ManagerHotelCard[] = hotels.map((h) => ({
    ...h,
    roomTypes: roomsByHotel.get(h.id)?.count ?? 0,
    capacity: roomsByHotel.get(h.id)?.capacity ?? 0,
    occupiedTonight: occupiedByHotel.get(h.id) ?? 0,
  }));

  return NextResponse.json(cards);
}
