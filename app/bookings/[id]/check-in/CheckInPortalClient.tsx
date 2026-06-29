"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Price } from "@/components/Price";
import {
  UserIcon,
  CalendarIcon,
  BuildingIcon,
  CheckCircleIcon,
  LockIcon,
  ArrowLeftIcon,
} from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function CheckInPortalClient({ booking }: { booking: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(booking.status);
  const [loading, setLoading] = useState(false);
  const [collectedBalance, setCollectedBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const payment = booking.payments?.[0];
  const paidAmount = payment?.amount ? Number(payment.amount) : 0;
  const isPaidOnline = payment?.status === "completed" && paidAmount > 0;
  const remainingBalance = Number(booking.total_price) - paidAmount;
  const hasRemainingBalance = remainingBalance > 0;

  const guest = booking.profiles || {
    full_name: "Guest",
    email: "No email provided",
    phone: "No phone provided",
  };

  async function handleStatusTransition(newStatus: "checked_in" | "completed") {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update status");

      setStatus(newStatus);
      setSuccessMsg(
        newStatus === "checked_in"
          ? "Guest has been checked in successfully!"
          : "Guest has been checked out and stay is completed!"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl p-6 relative"
      >
        {/* Header */}
        <div className="border-b border-slate-100 pb-4 mb-5 text-left">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              (BOOKING_STATUS_STYLES as any)[status] || "bg-slate-100 text-slate-600"
            }`}
          >
            {(BOOKING_STATUS_LABELS as any)[status] || status}
          </span>
          <h1 className="text-xl font-black text-slate-900 font-serif mt-1.5 truncate">
            {booking.hotels?.name}
          </h1>
          <p className="text-xs text-slate-400 font-medium truncate">
            {booking.hotels?.location}
          </p>
        </div>

        {/* Success / Error Messages */}
        <AnimatePresence mode="wait">
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3.5 text-xs text-green-700 font-semibold text-left flex items-start gap-2"
            >
              <CheckCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-semibold text-left"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Details Card */}
        <div className="rounded-2xl border border-slate-150/80 bg-slate-50/50 p-4 text-left space-y-3 mb-5">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <UserIcon className="h-3.5 w-3.5 text-brand-600" /> Guest Details
          </h2>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-slate-800 text-sm">{guest.full_name}</p>
            <p className="text-slate-500 font-medium">{guest.email}</p>
            <p className="text-slate-500 font-medium">{guest.phone}</p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-3 text-[11px] mt-1">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Check In</span>
              <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_in)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Check Out</span>
              <p className="font-bold text-slate-800 mt-0.5">{fmt(booking.check_out)}</p>
            </div>
          </div>
          <div className="border-t border-slate-200/60 pt-2 text-[11px] flex justify-between mt-1">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Room Type</span>
              <span className="font-bold text-slate-800">{booking.rooms?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Quantity</span>
              <span className="font-bold text-slate-800">{booking.num_rooms} Room(s)</span>
            </div>
          </div>
        </div>

        {/* Payment Summary & Collection Alerts */}
        <div className="rounded-2xl border border-slate-200/85 bg-white p-4 text-left text-xs space-y-2 mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
            <LockIcon className="h-3.5 w-3.5 text-brand-600" /> Payment & Billing
          </h2>
          <div className="flex justify-between text-slate-500">
            <span>Total stay charge</span>
            <Price amount={Number(booking.total_price)} className="font-semibold" />
          </div>
          <div className="flex justify-between text-green-600 font-bold">
            <span>Paid online</span>
            <Price amount={paidAmount} />
          </div>

          <div className="border-t border-dashed border-slate-200 my-2" />

          {hasRemainingBalance ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-black text-slate-800 bg-brand-50/10 p-2.5 rounded-lg border border-brand-100/50">
                <span>Collect at desk</span>
                <Price amount={remainingBalance} />
              </div>

              {(status === "confirmed" || status === "checked_in") && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 font-medium leading-relaxed">
                  ⚠️ <strong>Action Required:</strong> Please collect{" "}
                  <span className="font-bold"><Price amount={remainingBalance} /></span> in cash or card from the guest.
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between text-sm font-black text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              <span>Remaining balance</span>
              <span className="text-green-600 uppercase tracking-wider text-[10px] font-black">Fully Paid</span>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          {status === "confirmed" && (
            <button
              onClick={() => handleStatusTransition("checked_in")}
              disabled={loading}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : "Confirm Guest Check-In"}
            </button>
          )}

          {status === "checked_in" && (
            <div className="space-y-3">
              {hasRemainingBalance && (
                <label className="flex items-start gap-2 text-xs text-slate-600 text-left p-2 bg-slate-50 rounded-xl border border-slate-200/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={collectedBalance}
                    onChange={(e) => setCollectedBalance(e.target.checked)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <span>
                    I confirm that I have collected the outstanding balance of{" "}
                    <span className="font-bold text-slate-800"><Price amount={remainingBalance} /></span>.
                  </span>
                </label>
              )}

              <button
                onClick={() => handleStatusTransition("completed")}
                disabled={loading || (hasRemainingBalance && !collectedBalance)}
                className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition shadow-md hover:shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : "Complete Guest Check-Out"}
              </button>
            </div>
          )}

          {status === "completed" && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-xs text-green-700 font-semibold text-center flex flex-col items-center gap-2">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <span>Stay Completed. Guest has checked out.</span>
            </div>
          )}

          {status === "pending" && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-semibold text-center flex flex-col items-center gap-2">
              <span>
                ⚠️ Booking is Unpaid. Guest must complete payment before check-in can be processed.
              </span>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
