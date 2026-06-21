import Link from "next/link";
import Image from "next/image";
import { Price } from "@/components/Price";
import { HeartButton } from "@/components/HeartButton";
import { StarIcon, MapPinIcon } from "@/components/icons";
import { Wifi, Compass, Coffee, ShieldCheck } from "lucide-react";
import type { HotelCardData } from "@/lib/types";

import { getOptimizedImageUrl } from "@/lib/image";

export function HotelCard({ hotel }: { hotel: HotelCardData }) {
  // Determine badge based on rating and pricing metadata
  let badgeText = "Newly added";
  let badgeClass = "bg-gold-500 text-white";

  if (hotel.rating && hotel.rating >= 4.8 && hotel.minPrice && hotel.minPrice >= 10000) {
    badgeText = "Luxury";
    badgeClass = "bg-brand-700 text-white";
  } else if (hotel.rating && hotel.rating >= 4.7) {
    badgeText = "Guest favourite";
    badgeClass = "bg-gold-500 text-white";
  } else if (hotel.rating && hotel.rating >= 4.5) {
    badgeText = "Bestseller";
    badgeClass = "bg-brand-600 text-white";
  }

  return (
    <Link
      href={`/hotels/${hotel.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-200/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {hotel.image_url ? (
          <Image
            src={getOptimizedImageUrl(hotel.image_url, 600)}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <Compass className="h-12 w-12" />
          </div>
        )}

        {/* Brand / Premium Corner Badge */}
        <span className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm z-10 ${badgeClass}`}>
          {badgeText}
        </span>

        {/* Heart button */}
        <div className="absolute right-3 top-3 z-10">
          <HeartButton />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition truncate">{hotel.name}</h3>
        
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPinIcon className="h-3.5 w-3.5 text-brand-500 shrink-0" /> 
          <span className="truncate">{hotel.location}</span>
        </p>

        {/* Rating and review stats */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-0.5 text-gold-500">
            <StarIcon className="h-3.5 w-3.5" filled />
          </div>
          <span className="font-bold text-slate-800">
            {hotel.rating !== null ? hotel.rating.toFixed(1) : "5.0"}
          </span>
          <span className="text-slate-400">
            ({hotel.reviewCount || 0} reviews)
          </span>
        </div>

        {/* Amenity Icons Strip */}
        <div className="flex items-center gap-2.5 pt-1 text-slate-400">
          <Wifi className="h-3.5 w-3.5" />
          <Compass className="h-3.5 w-3.5" />
          <Coffee className="h-3.5 w-3.5" />
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>

        {/* Price Tag */}
        <div className="mt-auto border-t border-slate-100 pt-3 flex items-baseline justify-between">
          {hotel.minPrice !== null ? (
            <span>
              <Price
                amount={hotel.minPrice}
                className="text-base font-black text-brand-600"
              />
              <span className="text-xs text-slate-500 font-medium"> / night</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400">Price on request</span>
          )}
        </div>
      </div>
    </Link>
  );
}
