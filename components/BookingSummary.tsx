"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Price } from "@/components/Price";
import {
  MapPinIcon,
  StarIcon,
  ShieldIcon,
  ChevronDownIcon,
  BuildingIcon,
} from "@/components/icons";
import type { PriceQuote } from "@/lib/types";

const fmt = (s: string) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export function BookingSummary({
  hotel,
  rating,
  reviewCount,
  pricePerNight,
  roomName,
  stay,
  quote,
  onEdit,
}: {
  hotel: { name: string; location: string; image_url: string | null };
  rating: number | null;
  reviewCount: number;
  pricePerNight: number | null;
  roomName?: string;
  stay: {
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
    nights: number;
  };
  quote: PriceQuote | null;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-40 bg-slate-100">
        {hotel.image_url ? (
          <Image
            src={hotel.image_url}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <BuildingIcon className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-lg font-bold text-slate-900">{hotel.name}</h2>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPinIcon className="h-4 w-4 text-rose-500" /> {hotel.location}
        </p>
        {rating !== null && (
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-700">
            <StarIcon className="h-4 w-4 text-amber-400" filled />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-slate-400">({reviewCount} reviews)</span>
          </p>
        )}

        {roomName ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-800">{roomName}</span>
            {pricePerNight !== null && (
              <span className="text-slate-600">
                <Price amount={pricePerNight} className="font-semibold" /> / night
              </span>
            )}
          </div>
        ) : (
          pricePerNight !== null && (
            <div className="mt-4">
              <Price
                amount={pricePerNight}
                className="text-2xl font-bold text-slate-900"
              />
              <span className="text-sm text-slate-500"> / night</span>
              <p className="text-xs text-slate-400">Taxes &amp; fees added at checkout</p>
            </div>
          )
        )}

        {/* Your stay */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Your stay</h3>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-sm font-semibold text-rose-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Row label="Check-in" value={fmt(stay.checkIn)} />
            <Row label="Check-out" value={fmt(stay.checkOut)} />
            <Row label="Guests" value={`${stay.guests} Guest${stay.guests === 1 ? "" : "s"}`} />
            <Row label="Rooms" value={`${stay.rooms} Room${stay.rooms === 1 ? "" : "s"}`} />
            <Row label="Nights" value={`${stay.nights} Night${stay.nights === 1 ? "" : "s"}`} />
          </dl>
        </div>

        {/* Price breakdown */}
        {quote && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
            >
              Price breakdown
              <motion.span animate={{ rotate: open ? 180 : 0 }}>
                <ChevronDownIcon className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 text-sm">
                    <Row
                      label={`Room price (${quote.nights} night${quote.nights === 1 ? "" : "s"}${quote.numRooms > 1 ? ` × ${quote.numRooms}` : ""})`}
                      value={<Price amount={quote.base} />}
                    />
                    <Row label="GST (18%)" value={<Price amount={quote.gst} />} />
                    <Row label="Platform fee (2%)" value={<Price amount={quote.platformFee} />} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
              <span>Total</span>
              <Price amount={quote.total} />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <ShieldIcon className="h-5 w-5 text-emerald-500" />
          <span>
            <span className="font-semibold text-slate-700">Secure booking</span> —
            your data is safe and encrypted.
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
