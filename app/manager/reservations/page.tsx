import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Price } from "@/components/Price";
import { CalendarIcon, UsersIcon } from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { Booking, BookingStatus, PublicProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

// A booking row with hotel + room joined in (Postgres FK embed via PostgREST).
type Row = Booking & {
  hotels: { id: string; name: string; location: string } | null;
  rooms: { id: string; name: string; capacity: number } | null;
};

const ALL_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
];

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStatus = params.status as BookingStatus | undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Which hotels does this manager own?
  const { data: hotels } = await supabase
    .from("hotels")
    .select("id")
    .eq("manager_id", user?.id ?? "");
  const hotelIds = (hotels ?? []).map((h) => h.id);

  // 2. Bookings for those hotels (RLS also enforces this server-side).
  let rows: Row[] = [];
  if (hotelIds.length) {
    let query = supabase
      .from("bookings")
      .select("*, hotels(id, name, location), rooms(id, name, capacity)")
      .in("hotel_id", hotelIds)
      .order("check_in", { ascending: false });

    if (activeStatus) {
      query = query.eq("status", activeStatus);
    }

    const { data } = await query;
    rows = (data as Row[] | null) ?? [];
  }

  // 3. Guest names — public_profiles is a view, so PostgREST can't FK-embed
  // through it. Fetch separately and merge in JS.
  const guestIds = Array.from(new Set(rows.map((r) => r.guest_id)));
  let guestNames: Record<string, string> = {};
  if (guestIds.length) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", guestIds);
    guestNames = Object.fromEntries(
      ((profiles as Pick<PublicProfile, "id" | "full_name">[] | null) ?? []).map(
        (p) => [p.id, p.full_name ?? "Guest"],
      ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reservations</h1>
        <p className="text-sm text-slate-500">
          Bookings across all of your hotels.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab label="All" href="/manager/reservations" active={!activeStatus} />
        {ALL_STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={BOOKING_STATUS_LABELS[s]}
            href={`/manager/reservations?status=${s}`}
            active={activeStatus === s}
          />
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Hotel / Room</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No reservations{activeStatus ? ` with status "${BOOKING_STATUS_LABELS[activeStatus]}"` : ""} yet.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {guestNames[b.guest_id] ?? "Guest"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/manager/dashboard`}
                      className="font-medium text-slate-800 hover:text-brand-600"
                    >
                      {b.hotels?.name ?? "—"}
                    </Link>
                    <p className="text-xs text-slate-500">{b.rooms?.name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                      {fmt(b.check_in)} → {fmt(b.check_out)}
                    </span>
                    <p className="text-xs text-slate-400">{b.nights} night{b.nights === 1 ? "" : "s"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                      {b.guest_count}
                    </span>
                    <p className="text-xs text-slate-400">{b.num_rooms} room{b.num_rooms === 1 ? "" : "s"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${BOOKING_STATUS_STYLES[b.status]}`}
                    >
                      {BOOKING_STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    <Price amount={b.total_price} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-brand-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}