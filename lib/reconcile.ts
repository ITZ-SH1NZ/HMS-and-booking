import type { SupabaseClient } from "@supabase/supabase-js";
import { razorpay } from "@/lib/razorpay";

// Webhook-free safety net: ask Razorpay whether the order was actually paid,
// and confirm the booking if so. Uses only the API key — no dashboard/webhook.
// Runs as the signed-in guest, so confirm_razorpay_payment's ownership check
// passes.
export async function reconcilePendingBooking(
  supabase: SupabaseClient,
  bookingId: string,
  orderId: string | null,
): Promise<boolean> {
  if (!orderId) return false;
  try {
    const res = await razorpay.orders.fetchPayments(orderId);
    const captured = res.items?.find((p) => p.status === "captured");
    if (!captured) return false;

    const { error } = await supabase.rpc("confirm_razorpay_payment", {
      p_booking_id: bookingId,
      p_order_id: orderId,
      p_payment_id: captured.id,
    });
    return !error;
  } catch {
    return false;
  }
}
