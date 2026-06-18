import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookingCard } from "@/components/BookingCard";
import type { BookingDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(
      "*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)",
    )
    .order("created_at", { ascending: false });

  if (status === "upcoming") {
    query = query.in("status", ["pending", "confirmed", "checked_in"]);
  } else if (status === "completed") {
    query = query.eq("status", "completed");
  } else if (status === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const { data } = await query;
  const bookings = (data as BookingDetail[] | null) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">My bookings</h1>
      <p className="text-sm text-slate-500">View and manage your reservations.</p>

      <div className="mt-6 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/dashboard/bookings${f.key === "all" ? "" : `?status=${f.key}`}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              status === f.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {bookings.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="font-medium text-slate-700">No bookings here yet</p>
            <Link href="/" className="mt-2 text-sm font-semibold text-rose-600">
              Browse hotels
            </Link>
          </div>
        ) : (
          bookings.map((b) => <BookingCard key={b.id} booking={b} />)
        )}
      </div>
    </div>
  );
}
