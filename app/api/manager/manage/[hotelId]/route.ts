import { NextResponse } from "next/server";
import { getManagerContext } from "@/lib/authServer";
import type { Booking, StaffPermission } from "@/lib/types";
import type { FrontDeskRoom } from "@/app/manager/manage/[hotelId]/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = await params;
  const { supabase, userId } = await getManagerContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, name, location, manager_id")
    .eq("id", hotelId)
    .maybeSingle();

  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isManager = hotel.manager_id === userId;

  const [roomsRes, bookingsRes, assignmentRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, price, total_units, capacity, adults, children")
      .eq("hotel_id", hotelId)
      .order("price", { ascending: true }),
    supabase
      .from("bookings")
      .select(
        "id, hotel_id, room_id, guest_id, guest_name, guest_phone, guest_email, source, check_in, check_out, nights, guest_count, num_rooms, room_price, total_price, status, special_requests, created_at",
      )
      .eq("hotel_id", hotelId)
      .order("check_in", { ascending: false }),
    isManager
      ? Promise.resolve({ data: null })
      : supabase.from("hotel_staff").select("permissions").eq("hotel_id", hotelId).eq("staff_id", userId).maybeSingle(),
  ]);

  const permissions: StaffPermission[] = isManager
    ? ["offline_booking", "view_occupancy", "manage_rooms"]
    : ((assignmentRes.data as { permissions: StaffPermission[] } | null)?.permissions ?? []);

  return NextResponse.json({
    hotel: { id: hotel.id, name: hotel.name, location: hotel.location },
    rooms: (roomsRes.data as FrontDeskRoom[] | null) ?? [],
    bookings: (bookingsRes.data as Booking[] | null) ?? [],
    permissions,
    isManager,
  });
}
