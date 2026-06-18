import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/bookings/[id] — full booking detail (RLS enforces access).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  return NextResponse.json({ booking: data });
}
