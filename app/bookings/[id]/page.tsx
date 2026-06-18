import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reconcilePendingBooking } from "@/lib/reconcile";
import { Price } from "@/components/Price";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { BookingActions } from "@/components/BookingActions";
import { MapPinIcon, CalendarIcon } from "@/components/icons";
import {
  BOOKING_STATUS_STYLES,
  BOOKING_STATUS_LABELS,
} from "@/lib/booking";
import type { BookingDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/bookings/${id}`);

  const select =
    "*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)";

  let { data } = await supabase
    .from("bookings")
    .select(select)
    .eq("id", id)
    .maybeSingle();

  let booking = data as BookingDetail | null;
  if (!booking) notFound();

  // Webhook-free safety net: if still pending, re-check with Razorpay and
  // re-fetch if it just got confirmed.
  if (booking.status === "pending") {
    const confirmed = await reconcilePendingBooking(
      supabase,
      booking.id,
      booking.payments?.[0]?.order_id ?? null,
    );
    if (confirmed) {
      ({ data } = await supabase
        .from("bookings")
        .select(select)
        .eq("id", id)
        .maybeSingle());
      booking = (data as BookingDetail | null) ?? booking;
    }
  }

  const payment = booking.payments?.[0];
  const quote = {
    roomPrice: booking.room_price,
    nights: booking.nights,
    numRooms: booking.num_rooms,
    base: booking.base_price,
    gst: booking.gst,
    platformFee: booking.platform_fee,
    total: booking.total_price,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/dashboard/bookings"
        className="text-sm font-semibold text-rose-600"
      >
        ← All bookings
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {booking.hotels?.name}
          </h1>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <MapPinIcon className="h-4 w-4 text-rose-500" /> {booking.hotels?.location}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
        >
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">Booking ID: {booking.id}</p>

      <div className="mt-6 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Stay details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info icon label="Check in" value={fmt(booking.check_in)} />
            <Info icon label="Check out" value={fmt(booking.check_out)} />
            <Info label="Room" value={`${booking.rooms?.name} × ${booking.num_rooms}`} />
            <Info label="Guests" value={`${booking.guest_count}`} />
            <Info label="Nights" value={`${booking.nights}`} />
          </div>
          {booking.special_requests && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Requests:</span>{" "}
              {booking.special_requests}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Price details</h2>
          <PriceBreakdown quote={quote} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Payment</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              {payment?.payment_method?.toUpperCase() ?? "UPI"} ·{" "}
              <span className="capitalize">{payment?.status ?? "pending"}</span>
            </span>
            <Price amount={payment?.amount ?? booking.total_price} className="font-semibold" />
          </div>
          {payment?.transaction_id && (
            <p className="mt-1 text-xs text-slate-400">Ref: {payment.transaction_id}</p>
          )}
          {booking.status === "cancelled" && booking.refund_amount != null && (
            <p className="mt-2 text-sm text-emerald-700">
              Refund: <Price amount={booking.refund_amount} />
              {booking.cancellation_reason && (
                <span className="text-slate-400"> · {booking.cancellation_reason}</span>
              )}
            </p>
          )}
        </section>

        <BookingActions
          bookingId={booking.id}
          status={booking.status}
          checkIn={booking.check_in}
          totalPrice={booking.total_price}
        />
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-slate-500">
        {icon && <CalendarIcon className="h-4 w-4 text-slate-400" />}
        {label}
      </p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
