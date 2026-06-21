import Link from "next/link";
import Image from "next/image";
import { Price } from "@/components/Price";
import { BuildingIcon, MapPinIcon, CalendarIcon } from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { BookingDetail } from "@/lib/types";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function BookingCard({ booking }: { booking: BookingDetail }) {
  const hotel = booking.hotels;
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {hotel?.image_url ? (
          <Image
            src={hotel.image_url}
            alt={hotel.name}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <BuildingIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900">
              {hotel?.name ?? "Hotel"}
            </h3>
            <p className="flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPinIcon className="h-4 w-4 text-rose-500" /> {hotel?.location}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
          >
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          {fmt(booking.check_in)} → {fmt(booking.check_out)} · {booking.nights}{" "}
          night{booking.nights === 1 ? "" : "s"}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500">
            {booking.rooms?.name} · {booking.num_rooms} room
            {booking.num_rooms === 1 ? "" : "s"}
          </span>
          <Price amount={booking.total_price} className="font-bold text-slate-900" />
        </div>
      </div>
    </Link>
  );
}
