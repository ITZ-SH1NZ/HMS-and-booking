import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/payments/confirm — mark a UPI payment complete and confirm booking.
// UPI transfers have no automatic callback, so the guest confirms after paying
// (optionally with the UPI reference / UTR). This is trust-based by design.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let bookingId = "";
  let reference = "";
  let method = "upi";
  try {
    const body = await request.json();
    bookingId = body?.bookingId ?? "";
    reference = body?.reference ?? "";
    method = body?.method ?? "upi";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const { error } = await supabase.rpc("confirm_payment", {
    p_booking_id: bookingId,
    p_reference: reference || null,
    p_method: method,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
