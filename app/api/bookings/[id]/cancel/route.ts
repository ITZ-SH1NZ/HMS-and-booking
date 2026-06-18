import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay } from "@/lib/razorpay";

// PUT /api/bookings/[id]/cancel — cancel, release inventory, compute refund,
// and (if a Razorpay payment was captured) issue a proportional refund.
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

  // Capture the payment state BEFORE cancelling (the RPC flips it to refunded).
  const { data: payment } = await supabase
    .from("payments")
    .select("status, transaction_id")
    .eq("booking_id", id)
    .maybeSingle();

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: id,
    p_reason: reason,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refundPct = (data as { refund_pct?: number })?.refund_pct ?? 0;

  // Issue the actual Razorpay refund for the captured proportion.
  let refundError: string | null = null;
  if (refundPct > 0 && payment?.status === "completed" && payment.transaction_id) {
    try {
      const captured = await razorpay.payments.fetch(payment.transaction_id);
      const amountPaise = Math.round(Number(captured.amount) * refundPct);
      if (amountPaise > 0) {
        await razorpay.payments.refund(payment.transaction_id, {
          amount: amountPaise,
          speed: "normal",
          notes: { bookingId: id, reason },
        });
      }
    } catch (e) {
      // DB already marked the payment refunded; surface the gateway issue.
      refundError = e instanceof Error ? e.message : "Refund could not be processed";
    }
  }

  return NextResponse.json({ ...data, refundError });
}
