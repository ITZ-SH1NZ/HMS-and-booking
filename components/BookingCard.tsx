"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Price } from "@/components/Price";
import { BuildingIcon, MapPinIcon, CalendarIcon } from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { BookingDetail } from "@/lib/types";
import { getOptimizedImageUrl } from "@/lib/image";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const MotionLink = motion(Link);

export function BookingCard({ booking }: { booking: BookingDetail }) {
  const hotel = booking.hotels;
  return (
    <MotionLink
      href={`/bookings/${booking.id}`}
      whileHover={{ y: -3, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.02)" }}
      transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
      className="flex gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 transition-all hover:border-brand-200/60 group cursor-pointer"
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-50">
        {hotel?.image_url ? (
          <Image
            src={getOptimizedImageUrl(hotel.image_url, 300, 80)}
            alt={hotel.name}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
            <h3 className="truncate font-bold text-slate-900 leading-snug">
              {hotel?.name ?? "Hotel"}
            </h3>
            <p className="flex items-center gap-1 truncate text-xs font-semibold text-slate-400 mt-0.5">
              <MapPinIcon className="h-3.5 w-3.5 text-brand-500" /> {hotel?.location}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${BOOKING_STATUS_STYLES[booking.status]}`}
          >
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-650">
          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
          {fmt(booking.check_in)} → {fmt(booking.check_out)} · {booking.nights}{" "}
          night{booking.nights === 1 ? "" : "s"}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-slate-400">
            {booking.rooms?.name} · {booking.num_rooms} room
            {booking.num_rooms === 1 ? "" : "s"}
          </span>
          <Price amount={booking.total_price} className="font-black text-slate-900 text-sm" />
        </div>
      </div>
    </MotionLink>
  );
}
