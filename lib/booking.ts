import type { PriceQuote, BookingStatus } from "@/lib/types";

export const GST_RATE = 0.18;
export const PLATFORM_FEE_RATE = 0.02;

// Commission the platform keeps from the manager's room revenue (used for the
// payout split + earnings accounting). Manager keeps (1 - this) of room base.
export const PLATFORM_COMMISSION_RATE = 0.15;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Local YYYY-MM-DD (avoids UTC shifting from toISOString).
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

// Number of nights between two YYYY-MM-DD dates.
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

// Mirror of the server-side price math in book_room (kept in sync for preview).
export function computeQuote(
  roomPrice: number,
  nights: number,
  numRooms: number,
): PriceQuote {
  const base = round2(roomPrice * nights * numRooms);
  const gst = round2(base * GST_RATE);
  const platformFee = round2(base * PLATFORM_FEE_RATE);
  const total = round2(base + gst + platformFee);
  return { roomPrice, nights, numRooms, base, gst, platformFee, total };
}

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  checked_in: "bg-sky-50 text-sky-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-50 text-rose-700",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Refund policy mirror (display only — server recomputes authoritatively).
export function refundPolicy(checkIn: string): {
  pct: number;
  label: string;
} {
  const hours = (new Date(`${checkIn}T00:00:00`).getTime() - Date.now()) / 3_600_000;
  if (hours >= 48) return { pct: 1, label: "Full refund (48h+ before check-in)" };
  if (hours >= 24) return { pct: 0.5, label: "50% refund (24–48h before)" };
  return { pct: 0, label: "No refund (under 24h before check-in)" };
}
