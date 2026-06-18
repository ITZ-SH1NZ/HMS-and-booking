import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT /api/bookings/[id]/cancel — cancel, release inventory, compute refund.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let reason = "";
  try {
    const body = await request.json();
    reason = body?.reason ?? "";
  } catch {
    // no body is fine
  }

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: id,
    p_reason: reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
