import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nightsBetween } from "@/lib/booking";

// GET /api/availability?hotelId=&checkIn=&checkOut=
// Returns each room type with how many units are free for the whole range.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get("hotelId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!hotelId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "hotelId, checkIn and checkOut are required" },
      { status: 400 },
    );
  }
  if (nightsBetween(checkIn, checkOut) < 1) {
    return NextResponse.json(
      { error: "Check-out must be at least one night after check-in" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("room_availability", {
    p_hotel_id: hotelId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rooms: data ?? [] });
}
