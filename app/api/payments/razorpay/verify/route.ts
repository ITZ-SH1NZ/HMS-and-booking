import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

// POST /api/payments/razorpay/verify — validate the checkout signature, then
// confirm the booking. Signature = HMAC_SHA256(order_id|payment_id, secret).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let bookingId = "";
  let orderId = "";
  let paymentId = "";
  let signature = "";
  try {
    ({
      bookingId,
      orderId,
      paymentId,
      signature,
    } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!bookingId || !orderId || !paymentId || !signature) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 },
    );
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // Timing-safe comparison.
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!valid) {
    return NextResponse.json(
      { error: "Payment signature verification failed" },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("confirm_razorpay_payment", {
    p_booking_id: bookingId,
    p_order_id: orderId,
    p_payment_id: paymentId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
