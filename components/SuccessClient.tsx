"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { Price } from "@/components/Price";
import { ShieldIcon, CalendarIcon, BuildingIcon } from "@/components/icons";
import { CheckInQrCard } from "@/components/CheckInQrCard";
import type { BookingDetail } from "@/lib/types";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function SuccessClient({ booking }: { booking: BookingDetail }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR code for check-in portal
    if (typeof window !== "undefined") {
      QRCode.toDataURL(`${window.location.origin}/bookings/${booking.id}/check-in`)
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("QR Code generation failed:", err));
    }

    // Trigger a beautiful confetti explosion on mount
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#0f4c3a", "#d4af37", "#1e293b", "#10b981"],
    });

    const timer1 = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#0f4c3a", "#d4af37"],
      });
    }, 250);

    const timer2 = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#0f4c3a", "#d4af37"],
      });
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [booking.id]);

  const payment = booking.payments?.[0];
  const paidAmount = payment?.amount ? Number(payment.amount) : 0;
  const isPaidOnline = payment?.status === "completed" && paidAmount > 0;
  const isAdvancePayment = isPaidOnline && paidAmount < Number(booking.total_price);
  const remainingAmount = Number(booking.total_price) - paidAmount;

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-xl flex-col justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl backdrop-blur-md bg-white/95 relative"
      >
        {/* Animated Self-Drawing Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50/10 border border-green-200 text-green-600 shadow-inner mb-5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="h-9 w-9"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
            />
          </svg>
        </motion.div>

        {/* Confirmation Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-tight"
        >
          Booking Confirmed!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-slate-500 mt-1 font-medium"
        >
          Your reservation has been secured successfully.
        </motion.p>

        {/* Hotel Image & Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm border border-slate-100 mt-6 mb-6"
        >
          {booking.hotels?.image_url ? (
            <Image
              src={booking.hotels.image_url}
              alt={booking.hotels.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-300">
              <BuildingIcon className="h-12 w-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-4 left-4 text-left right-4">
            <span className="inline-block rounded bg-brand-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
              Stay Reserved
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight mt-1 truncate">
              {booking.hotels?.name}
            </h2>
            <p className="text-xs text-slate-300 font-medium truncate">
              {booking.hotels?.location}
            </p>
          </div>
        </motion.div>

        {/* Room & Stay Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-left text-xs border border-slate-150/60 mb-6"
        >
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Booking ID</span>
            <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
              {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Room Type</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">
              {booking.rooms?.name} <span className="text-slate-500">× {booking.num_rooms}</span>
            </p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 col-span-2 grid grid-cols-2 gap-4 mt-1">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 text-brand-600" /> Check In
              </span>
              <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_in)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 text-brand-600" /> Check Out
              </span>
              <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_out)}</p>
            </div>
          </div>
        </motion.div>

        {/* Payment Breakdown / Receipt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 text-left text-xs space-y-2 mb-6 shadow-xs"
        >
          <div className="flex justify-between text-slate-500">
            <span>Total booking price</span>
            <Price amount={Number(booking.total_price)} className="font-semibold" />
          </div>

          {isAdvancePayment ? (
            <>
              <div className="flex justify-between text-green-600 font-bold">
                <span>Paid online (Advance)</span>
                <Price amount={paidAmount} />
              </div>
              <div className="border-t border-dashed border-slate-200 my-2" />
              <div className="flex justify-between text-sm font-black text-slate-850 bg-brand-50/10 p-2 rounded-lg border border-brand-100/50">
                <span>Pay at hotel (Remaining)</span>
                <Price amount={remainingAmount} />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-850 font-bold">
                <span>Amount paid</span>
                <Price amount={paidAmount || Number(booking.total_price)} />
              </div>
              <div className="border-t border-dashed border-slate-200 my-2" />
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>Payment Status</span>
                <span className="text-green-600 uppercase tracking-wider text-[10px] font-black">
                  {isPaidOnline ? "Completed" : "Pay on Arrival"}
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* QR Code for Front Desk */}
        {qrUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65 }}
            className="my-6 w-full"
          >
            <CheckInQrCard
              qrCodeUrl={qrUrl}
              title="Check-In / Check-Out QR Code"
              subtitle="Show this QR code at the front desk for seamless check-in or checkout."
            />
          </motion.div>
        )}

        {/* What's Next Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-left border-t border-slate-100 pt-5 mb-8"
        >
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">What's Next?</h3>
          <div className="relative border-l-2 border-slate-100 pl-5 ml-2 space-y-5">
            <div className="relative">
              <div className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-green-500 ring-4 ring-white" />
              <p className="text-xs font-black text-slate-800">Booking Confirmed</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Your room is locked. A receipt has been saved under your profile.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" />
              <p className="text-xs font-black text-slate-700">Check In at Property</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Arrive on {fmt(booking.check_in)}.
                {isAdvancePayment && ` Remember to pay the remaining `}
                {isAdvancePayment && <span className="font-bold text-slate-700"><Price amount={remainingAmount} /></span>}
                {isAdvancePayment && ` at the front desk.`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-2.5 sm:flex-row border-t border-slate-100 pt-6"
        >
          <Link
            href={`/bookings/${booking.id}`}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 transition shadow-md hover:shadow-lg text-center"
          >
            View Full Booking
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition text-center"
          >
            Continue Browsing
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
