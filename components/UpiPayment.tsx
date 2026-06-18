"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getRates, formatMoney } from "@/lib/currency";
import { UPI_VPA, UPI_PAYEE, buildUpiUri } from "@/lib/upi";
import { Price } from "@/components/Price";

// UPI QR payment step. Converts the (base-currency) total to INR for the QR,
// shows the code + an "open in UPI app" link, then lets the guest confirm.
export function UpiPayment({
  bookingId,
  totalBase,
  onPaid,
}: {
  bookingId: string;
  totalBase: number;
  onPaid: () => void;
}) {
  const [amountInr, setAmountInr] = useState<number | null>(null);
  const [qr, setQr] = useState<string>("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Convert the USD-base total to INR for the UPI amount.
      const rates = await getRates();
      const inr = rates?.INR ? Math.round(totalBase * rates.INR * 100) / 100 : null;
      setAmountInr(inr);

      if (UPI_VPA) {
        const uri = buildUpiUri({
          amountInr: inr,
          note: `HMS booking ${bookingId.slice(0, 8)}`,
        });
        try {
          setQr(await QRCode.toDataURL(uri, { margin: 1, width: 240 }));
        } catch {
          setQr("");
        }
      }
    })();
  }, [bookingId, totalBase]);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reference, method: "upi" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not confirm payment");
      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm payment");
    } finally {
      setLoading(false);
    }
  }

  const upiUri = buildUpiUri({
    amountInr,
    note: `HMS booking ${bookingId.slice(0, 8)}`,
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-500">Amount to pay</p>
        <p className="text-2xl font-bold text-slate-900">
          {amountInr ? formatMoney(amountInr, "en-IN", "INR") : <Price amount={totalBase} />}
        </p>
        {amountInr && (
          <p className="mt-1 text-xs text-slate-400">
            (<Price amount={totalBase} /> converted to INR for UPI)
          </p>
        )}
      </div>

      {UPI_VPA ? (
        <div className="flex flex-col items-center gap-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="UPI QR code"
              className="rounded-xl border border-slate-200"
            />
          ) : (
            <div className="grid h-60 w-60 place-items-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
              Generating QR…
            </div>
          )}
          <p className="text-center text-sm text-slate-600">
            Scan with GPay, PhonePe or Paytm to pay{" "}
            <span className="font-semibold">{UPI_PAYEE}</span>
            <br />
            <span className="text-slate-400">{UPI_VPA}</span>
          </p>
          <a
            href={upiUri}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:hidden"
          >
            Open in UPI app
          </a>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          UPI isn&apos;t configured yet. Set <code>NEXT_PUBLIC_UPI_VPA</code> in{" "}
          <code>.env.local</code> to your UPI ID to show a real QR. You can still
          confirm below to complete the booking in dev.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          UPI reference / UTR (optional)
        </label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. 4291xxxxxxx"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        onClick={confirm}
        disabled={loading}
        className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Confirming…" : "I've completed the payment"}
      </button>
      <p className="text-center text-xs text-slate-400">
        UPI transfers have no automatic callback, so confirmation is manual.
      </p>
    </div>
  );
}
