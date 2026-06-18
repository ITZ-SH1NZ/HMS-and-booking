import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/webhooks/razorpay — server-authoritative payment confirmation.
// Razorpay calls this; we verify the signature against RAZORPAY_WEBHOOK_SECRET,
// then reconcile the booking even if the browser closed mid-payment.
//
// Set up in the Razorpay dashboard (test mode OTP 754081) with a secret you
// choose, pointing at <your-deployed-url>/api/webhooks/razorpay.
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Not configured yet (e.g. local dev before deploy) — accept and no-op so
  // Razorpay doesn't keep retrying.
  if (!secret || !serviceKey) {
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const raw = await request.text();

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      refund?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const payment = event.payload?.payment?.entity;

  // Resolve the booking from the order id stored on the payment row.
  async function bookingIdForOrder(orderId?: string) {
    if (!orderId) return null;
    const { data } = await supabase
      .from("payments")
      .select("booking_id")
      .eq("order_id", orderId)
      .maybeSingle();
    return data?.booking_id ?? null;
  }

  switch (event.event) {
    case "payment.captured": {
      const bookingId = await bookingIdForOrder(payment?.order_id);
      if (bookingId) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            transaction_id: payment?.id ?? null,
            paid_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId);
        // Only promote pending bookings (don't override cancelled/refunded).
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId)
          .eq("status", "pending");
      }
      break;
    }
    case "payment.failed": {
      const bookingId = await bookingIdForOrder(payment?.order_id);
      if (bookingId) {
        await supabase
          .from("payments")
          .update({ status: "failed", transaction_id: payment?.id ?? null })
          .eq("booking_id", bookingId);
      }
      break;
    }
    case "refund.processed":
    case "refund.created": {
      const bookingId = await bookingIdForOrder(payment?.order_id);
      if (bookingId) {
        await supabase
          .from("payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("booking_id", bookingId);
      }
      break;
    }
    default:
      // Unhandled event — acknowledge so Razorpay stops retrying.
      break;
  }

  return NextResponse.json({ ok: true });
}
