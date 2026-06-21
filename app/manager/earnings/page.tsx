import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Price } from "@/components/Price";
import { PLATFORM_COMMISSION_RATE } from "@/lib/booking";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Booking & { hotels: { name: string } | null };

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: hotels } = await supabase
    .from("hotels")
    .select("id")
    .eq("manager_id", user?.id ?? "");
  const hotelIds = (hotels ?? []).map((h) => h.id);

  let rows: Row[] = [];
  if (hotelIds.length) {
    const { data } = await supabase
      .from("bookings")
      .select("*, hotels(name)")
      .in("hotel_id", hotelIds)
      .in("status", ["confirmed", "checked_in", "completed"])
      .order("created_at", { ascending: false });
    rows = (data as Row[] | null) ?? [];
  }

  const keep = 1 - PLATFORM_COMMISSION_RATE;
  const earning = (b: Booking) => Math.round(b.base_price * keep * 100) / 100;
  const commission = (b: Booking) =>
    Math.round(b.base_price * PLATFORM_COMMISSION_RATE * 100) / 100;

  const totalEarnings = rows.reduce((a, b) => a + earning(b), 0);
  const totalCommission = rows.reduce((a, b) => a + commission(b), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
      <p className="text-sm text-slate-500">
        Your share of each booking after the {Math.round(PLATFORM_COMMISSION_RATE * 100)}%
        platform commission.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total earnings" value={<Price amount={totalEarnings} />} accent />
        <Stat label="Bookings" value={`${rows.length}`} />
        <Stat label="Platform commission" value={<Price amount={totalCommission} />} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Guest paid</th>
              <th className="px-4 py-3 text-right">Your earning</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No confirmed bookings yet.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${b.id}`} className="font-medium text-slate-800 hover:text-rose-600">
                      {b.hotels?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(b.check_in)} → {fmt(b.check_out)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${BOOKING_STATUS_STYLES[b.status]}`}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    <Price amount={b.total_price} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    <Price amount={earning(b)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        The split is computed automatically per booking. Payouts are settled
        manually until Razorpay Route is enabled — once you link a payout
        account, future payments split to you at capture.
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-rose-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
