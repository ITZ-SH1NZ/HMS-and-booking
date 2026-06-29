import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay, PLATFORM_COMMISSION_RATE } from "@/lib/razorpay";

// POST /api/payments/razorpay/order — create a Razorpay order for a booking.
// If the hotel's manager has a Route linked account, the order also splits the
// manager's share (room base minus platform commission) to that account.
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

  // RLS ensures the booking belongs to this user.
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      total_price,
      base_price,
      status,
      hotel_id,
      hotels (
        require_advance,
        advance_amount,
        advance_is_percent
      )
    `)
    .eq("id", bookingId)
    .maybeSingle();
 
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: "This booking is not awaiting payment" },
      { status: 400 },
    );
  }

  // Calculate amount to charge online (full price, or advance price if required)
  let amountToCharge = Number(booking.total_price);
  const hotel = booking.hotels as unknown as {
    require_advance: boolean | null;
    advance_amount: number | null;
    advance_is_percent: boolean | null;
  } | null;

  if (hotel?.require_advance) {
    if (hotel.advance_is_percent) {
      amountToCharge = amountToCharge * ((hotel.advance_amount ?? 100) / 100);
    } else {
      amountToCharge = Math.min(hotel.advance_amount ?? amountToCharge, amountToCharge);
    }
  }
 
  // Prices are stored in INR, so the order amount is simply paise.
  const amountPaise = Math.round(amountToCharge * 100);
 
  // Route split: pay the hotel owner their base (minus commission) if linked.
  let transfers:
    | { account: string; amount: number; currency: string; notes: Record<string, string> }[]
    | undefined;
  const { data: payoutAccount } = await supabase.rpc("hotel_payout_account", {
    p_hotel_id: booking.hotel_id,
  });
  if (payoutAccount) {
    const basePaise = Math.round(Number(booking.base_price) * 100);
    // Payout share is capped at the actual amount charged online
    const managerShare = Math.min(
      Math.round(basePaise * (1 - PLATFORM_COMMISSION_RATE)),
      amountPaise
    );
    if (managerShare > 0 && managerShare <= amountPaise) {
      transfers = [
        {
          account: payoutAccount as string,
          amount: managerShare,
          currency: "INR",
          notes: { bookingId },
        },
      ];
    }
  }

  try {
    // `transfers` (Route) isn't in the SDK's create type, so build + cast.
    const orderParams = {
      amount: amountPaise,
      currency: "INR",
      receipt: bookingId,
      notes: { bookingId },
      ...(transfers ? { transfers } : {}),
    };
    const order = await razorpay.orders.create(
      orderParams as Parameters<typeof razorpay.orders.create>[0],
    );

    await supabase.rpc("attach_payment_order", {
      p_booking_id: bookingId,
      p_order_id: order.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e) {
    // Razorpay SDK rejects with a plain object: { statusCode, error: { description } }
    console.error("[razorpay] order.create failed:", JSON.stringify(e));
    const err = e as { error?: { description?: string }; statusCode?: number };
    const msg =
      err?.error?.description ??
      (e instanceof Error ? e.message : "Could not create order");
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
