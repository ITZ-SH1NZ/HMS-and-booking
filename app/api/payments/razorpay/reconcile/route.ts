import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reconcilePendingBooking } from "@/lib/reconcile";

// POST /api/payments/razorpay/reconcile — manually re-check a pending booking's
// payment with Razorpay and confirm it if captured (webhook replacement).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let bookingId = "";
  try {
    ({ bookingId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("status, payments(order_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json({ confirmed: booking.status === "confirmed" });
  }

  const orderId = (booking.payments as { order_id: string | null }[] | null)?.[0]
    ?.order_id;
  const confirmed = await reconcilePendingBooking(supabase, bookingId, orderId ?? null);
  return NextResponse.json({ confirmed });
}
