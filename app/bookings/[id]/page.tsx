import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reconcilePendingBooking } from "@/lib/reconcile";
import { Price } from "@/components/Price";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { BookingActions } from "@/components/BookingActions";
import { MapPinIcon, CalendarIcon } from "@/components/icons";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import { ChevronLeft } from "lucide-react";
import {
  BOOKING_STATUS_STYLES,
  BOOKING_STATUS_LABELS,
} from "@/lib/booking";
import type { BookingDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
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
      <ScrollReveal duration={0.4}>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 hover:text-brand-800 transition group mb-6"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to bookings
        </Link>
      </ScrollReveal>

      <ScrollReveal delay={0.08} duration={0.45}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-serif leading-tight">
              {booking.hotels?.name}
            </h1>
            <p className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1.5">
              <MapPinIcon className="h-4 w-4 text-brand-500" /> {booking.hotels?.location}
            </p>
            <p className="mt-2 text-[10px] font-mono text-slate-400">ID: {booking.id}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${BOOKING_STATUS_STYLES[booking.status]}`}
          >
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </div>
      </ScrollReveal>

      <StaggerContainer className="space-y-5">
        
        {/* Stay Details */}
        <StaggerItem>
          <section className="rounded-3xl border border-slate-250/60 bg-white p-6 shadow-xs hover:shadow-md transition duration-300">
            <h2 className="mb-4 text-xs font-black text-slate-800 uppercase tracking-wider">Stay details</h2>
            
            {/* Visual Check In / Check Out Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-4 mb-4 text-sm">
              <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-150/40">
                <CalendarIcon className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Check In</p>
                  <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_in)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-150/40">
                <CalendarIcon className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Check Out</p>
                  <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_out)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <Info label="Room Type" value={`${booking.rooms?.name} × ${booking.num_rooms}`} />
              <Info label="Guests" value={`${booking.guest_count} Guest${booking.guest_count === 1 ? "" : "s"}`} />
              <Info label="Duration" value={`${booking.nights} Night${booking.nights === 1 ? "" : "s"}`} />
            </div>

            {booking.special_requests && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">Special Requests</span>
                <p className="text-slate-600 leading-relaxed font-semibold">{booking.special_requests}</p>
              </div>
            )}
          </section>
        </StaggerItem>

        {/* Price Details */}
        <StaggerItem>
          <section className="rounded-3xl border border-slate-250/60 bg-white p-6 shadow-xs hover:shadow-md transition duration-300">
            <h2 className="mb-4 text-xs font-black text-slate-800 uppercase tracking-wider">Price details</h2>
            <PriceBreakdown quote={quote} />
          </section>
        </StaggerItem>

        {/* Payment */}
        <StaggerItem>
          <section className="rounded-3xl border border-slate-250/60 bg-white p-6 shadow-xs hover:shadow-md transition duration-300">
            <h2 className="mb-4 text-xs font-black text-slate-800 uppercase tracking-wider">Payment</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-semibold">
                {payment?.payment_method?.toUpperCase() ?? "UPI"} ·{" "}
                <span className="capitalize">{payment?.status ?? "pending"}</span>
              </span>
              <Price amount={payment?.amount ?? booking.total_price} className="font-black text-slate-900" />
            </div>
            {payment?.transaction_id && (
              <p className="mt-2 text-xs font-mono text-slate-400">Ref: {payment.transaction_id}</p>
            )}
            {booking.status === "cancelled" && booking.refund_amount != null && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs">
                <span className="font-bold text-brand-700 uppercase tracking-wider text-[10px] block mb-1">Refund Details</span>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Refund of <span className="font-bold text-brand-700"><Price amount={booking.refund_amount} /></span> has been initiated.
                  {booking.cancellation_reason && (
                    <span className="text-slate-400"> · Reason: {booking.cancellation_reason}</span>
                  )}
                </p>
              </div>
            )}
          </section>
        </StaggerItem>

        {/* Booking Actions */}
        <StaggerItem>
          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            checkIn={booking.check_in}
            totalPrice={booking.total_price}
          />
        </StaggerItem>

      </StaggerContainer>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}
