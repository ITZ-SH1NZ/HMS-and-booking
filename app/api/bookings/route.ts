import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nightsBetween } from "@/lib/booking";
import type { BookingRequest } from "@/lib/types";

// GET /api/bookings?status=upcoming|completed|cancelled
// Returns the logged-in user's bookings (RLS scopes to the owner).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select(
      "*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)",
    )
    .order("created_at", { ascending: false });

  if (status === "upcoming") {
    query = query.in("status", ["pending", "confirmed", "checked_in"]);
  } else if (status === "completed") {
    query = query.eq("status", "completed");
  } else if (status === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bookings: data ?? [] });
}

// POST /api/bookings — create a (pending) booking, reserving inventory atomically.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to book" }, { status: 401 });
  }

  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { roomId, checkIn, checkOut, guestCount, numRooms, specialRequests } = body;
  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "roomId, checkIn and checkOut are required" },
      { status: 400 },
    );
  }
  if (nightsBetween(checkIn, checkOut) < 1) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("book_room", {
    p_room_id: roomId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guests: guestCount ?? 1,
    p_num_rooms: numRooms ?? 1,
    p_special: specialRequests ?? null,
  });

  if (error) {
    // Availability/validation failures come back as Postgres exceptions.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ bookingId: data });
}
