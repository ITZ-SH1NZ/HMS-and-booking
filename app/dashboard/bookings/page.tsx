import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookingCard } from "@/components/BookingCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
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
      <ScrollReveal duration={0.4}>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-serif">My Bookings</h1>
          <p className="text-sm text-slate-500 font-medium">View and manage your reservations.</p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1} duration={0.4}>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/dashboard/bookings${f.key === "all" ? "" : `?status=${f.key}`}`}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                status === f.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-250/60 text-slate-650 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </ScrollReveal>

      <StaggerContainer className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <StaggerItem>
            <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
              <p className="font-bold text-slate-700 text-sm">No bookings here yet</p>
              <Link href="/" className="mt-2 text-xs font-black text-brand-700 hover:underline">
                Browse hotels
              </Link>
            </div>
          </StaggerItem>
        ) : (
          bookings.map((b) => (
            <StaggerItem key={b.id}>
              <BookingCard booking={b} />
            </StaggerItem>
          ))
        )}
      </StaggerContainer>
    </div>
  );
}
