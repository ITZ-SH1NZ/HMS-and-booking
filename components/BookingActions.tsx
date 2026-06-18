"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Price } from "@/components/Price";
import { refundPolicy } from "@/lib/booking";
import type { BookingStatus } from "@/lib/types";

export function BookingActions({
  bookingId,
  status,
  checkIn,
  totalPrice,
}: {
  bookingId: string;
  status: BookingStatus;
  checkIn: string;
  totalPrice: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancellable = ["pending", "confirmed", "checked_in"].includes(status);
  const policy = refundPolicy(checkIn);
  const estRefund = Math.round(totalPrice * policy.pct * 100) / 100;

  async function refreshPayment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/razorpay/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not check payment");
      router.refresh();
      if (!json.confirmed) setError("Payment not received yet. Try again shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check payment");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not cancel booking");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {status === "pending" && (
          <button
            onClick={refreshPayment}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Refresh payment status"}
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Print receipt
        </button>
        {cancellable && !open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            Cancel booking
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <p className="text-sm font-semibold text-slate-800">Cancellation policy</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            <li>• Full refund if cancelled 48h+ before check-in</li>
            <li>• 50% refund if cancelled 24–48h before</li>
            <li>• No refund within 24h of check-in</li>
          </ul>
          <p className="mt-2 text-sm text-slate-700">
            Your estimated refund:{" "}
            <span className="font-bold">
              <Price amount={estRefund} />
            </span>{" "}
            <span className="text-slate-400">({policy.label})</span>
          </p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Reason for cancellation (optional)"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
          />

          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Keep booking
            </button>
            <button
              onClick={cancel}
              disabled={loading}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {loading ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
