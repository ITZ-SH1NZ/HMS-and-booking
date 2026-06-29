"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Price } from "@/components/Price";
import { HeartButton } from "@/components/HeartButton";
import { StarIcon, MapPinIcon } from "@/components/icons";
import { Wifi, Compass, Coffee, ShieldCheck } from "lucide-react";
import type { HotelCardData } from "@/lib/types";
import { getOptimizedImageUrl } from "@/lib/image";

export function HotelCard({ hotel }: { hotel: HotelCardData }) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse coordinate motion values for spring-lag follower
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 280, mass: 0.5 };
  const xSpring = useSpring(mouseX, springConfig);
  const ySpring = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Center the pill (width ~ 96px, height ~ 28px) under the cursor
    mouseX.set(e.clientX - rect.left - 48);
    mouseY.set(e.clientY - rect.top - 14);
  };

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
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-200/60 transition-all duration-500 hover:border-[#C5A880]/40 hover:shadow-md"
    >
      <div
        ref={containerRef}
        className="relative aspect-[4/3] overflow-hidden bg-slate-100 lg:hover:cursor-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hotel.image_url ? (
          <div className="w-full h-full overflow-hidden relative">
            <Image
              src={getOptimizedImageUrl(hotel.image_url, 600)}
              alt={hotel.name}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-hover:rotate-[0.5deg]"
            />
            {/* Subtle Luxury Gold Highlight Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E3829]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <Compass className="h-12 w-12" />
          </div>
        )}

        {/* Floating "DISCOVER" Tooltip (Desktop Only) */}
        <motion.div
          className="absolute pointer-events-none z-20 hidden lg:flex items-center justify-center px-4 py-1.5 rounded-full bg-[#FAF8F5]/95 backdrop-blur-xs text-[#0E3829] border border-[#C5A880]/45 shadow-md font-serif text-[9px] font-bold tracking-[0.25em] uppercase"
          style={{
            left: 0,
            top: 0,
            x: xSpring,
            y: ySpring,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          Discover
        </motion.div>

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
