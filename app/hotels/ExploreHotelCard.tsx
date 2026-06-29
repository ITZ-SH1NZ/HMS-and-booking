"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarIcon, MapPinIcon } from "@/components/icons";
import { HeartButton } from "@/components/HeartButton";
import { parseAmenities } from "@/lib/hotels";

// Custom Amenity Icons
function WifiIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 9.5a15 15 0 0 1 20 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function PoolIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

function GymIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6.5 6.5 11 11" />
      <path d="m11.5 6.5 6 6" />
      <path d="m6.5 11.5 6 6" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function ParkingIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}

function UtensilsIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v4" />
      <path d="M12 12V2" />
      <path d="M15 14h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />
      <path d="M18 8V2" />
    </svg>
  );
}

function SpaIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
      <path d="M12 6a6 6 0 0 1 6 6" />
      <path d="M12 12a3 3 0 0 0 3 3" />
    </svg>
  );
}

interface ExploreHotelCardProps {
  hotel: any;
  checkIn?: string;
  checkOut?: string;
  isSelected?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function ExploreHotelCard({
  hotel,
  checkIn,
  checkOut,
  isSelected = false,
  onMouseEnter,
  onMouseLeave,
}: ExploreHotelCardProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // 1. Resolve pricing details
  const prices = hotel.rooms?.map((r: any) => Number(r.price)).filter((p: number) => p > 0) ?? [];
  const minPrice = prices.length ? Math.min(...prices) : null;

  const nights = (() => {
    if (!checkIn || !checkOut) return 1;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  })();

  const gstPercent = hotel.gst_percent ?? 18;
  const baseTotal = minPrice ? minPrice * nights : null;
  const totalWithTax = baseTotal ? baseTotal * (1 + gstPercent / 100) : null;

  // 2. Parse photo array
  const photos = hotel.hotel_photos?.length
    ? [...hotel.hotel_photos].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const mainImageUrl = photos[activePhotoIndex]?.url || hotel.image_url || "/placeholder-hotel.jpg";

  // 3. Resolve rating label
  const rating = (() => {
    if (hotel.reviews?.length) {
      return hotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / hotel.reviews.length;
    }
    return hotel.rating ?? null;
  })();

  const reviewCount = hotel.reviews?.length ?? 0;

  const getRatingLabel = (r: number) => {
    if (r >= 4.8) return "Exceptional";
    if (r >= 4.5) return "Excellent";
    if (r >= 4.0) return "Very good";
    if (r >= 3.5) return "Good";
    if (r >= 3.0) return "Pleasant";
    return "Satisfactory";
  };

  // 4. Resolve dynamic badge
  const getBadgeText = () => {
    if (rating && rating >= 4.8) return "Guest favourite";
    if (rating && rating >= 4.6) return "Bestseller";
    if (minPrice && minPrice >= 12000) return "Luxury";
    return "Newly added";
  };

  const badgeText = getBadgeText();

  // 5. Parse amenities for display icons
  const hotelAmenities = parseAmenities(hotel.amenities).map(a => a.toLowerCase());

  const displayAmenities = [
    { label: "Free Wi-Fi", icon: WifiIcon, keys: ["wifi", "wi-fi", "free wi-fi", "free_wifi"] },
    { label: "Pool", icon: PoolIcon, keys: ["pool", "swimming pool", "swimming_pool"] },
    { label: "Gym", icon: GymIcon, keys: ["gym", "fitness", "exercise"] },
    { label: "Parking", icon: ParkingIcon, keys: ["parking", "garage"] },
    { label: "Restaurant", icon: UtensilsIcon, keys: ["restaurant", "dining", "bar", "food", "buffet"] },
    { label: "Spa", icon: SpaIcon, keys: ["spa", "massage"] },
  ].filter(item => item.keys.some(k => hotelAmenities.some(ha => ha.includes(k))));

  // 6. Check free cancellation tag
  const hasFreeCancellation = hotel.cancellation_policy === "flexible" || hotel.cancellation_policy === "moderate";
  const hasFreeBreakfast = hotelAmenities.some(ha => ha.includes("breakfast") || ha.includes("morning meal"));

  // Carousel handlers
  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    setActivePhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    setActivePhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group flex flex-col md:flex-row overflow-hidden rounded-2xl bg-white border transition duration-300 ${
        isSelected
          ? "border-brand-500 shadow-md ring-1 ring-brand-500/20"
          : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
      }`}
    >
      {/* LEFT: Image Carousel */}
      <div className="relative w-full md:w-[350px] aspect-[4/3] md:aspect-auto md:h-auto flex-shrink-0 bg-slate-50">
        {/* Main image */}
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={mainImageUrl}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, 350px"
            priority={isSelected}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>

        {/* Brand badge */}
        <div className="absolute left-3 top-3 z-10">
          <span className="inline-flex items-center rounded-md bg-brand-500 px-2 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
            {badgeText}
          </span>
        </div>

        {/* Wishlist Heart */}
        <div className="absolute right-3 top-3 z-10">
          <HeartButton />
        </div>

        {/* Carousel arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-800 hover:bg-white shadow hover:scale-105 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-800 hover:bg-white shadow hover:scale-105 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Photo Counter Overlay (Mobile) */}
            <div className="absolute right-3 bottom-3 md:hidden z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {activePhotoIndex + 1}/{photos.length}
            </div>
          </>
        )}

        {/* Thumbnail strip (Desktop only) */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 hidden md:flex justify-center gap-1 px-3 z-10">
            {photos.slice(0, 4).map((photo, i) => {
              const isLast = i === 3 && photos.length > 4;
              const isActive = i === activePhotoIndex;
              return (
                <button
                  key={photo.url || i}
                  onClick={(e) => {
                    e.preventDefault();
                    setActivePhotoIndex(i);
                  }}
                  className={`relative h-10 flex-1 rounded overflow-hidden border-2 transition ${
                    isActive ? "border-brand-500" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <Image src={photo.url} alt="thumbnail" fill className="object-cover" />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] font-bold text-white">
                      +{photos.length - 3}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Stay Details */}
      <div className="flex flex-1 flex-col p-4 md:p-5 text-slate-800">
        <div className="flex flex-1 flex-col gap-2">
          {/* Header name + Wishlist */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-brand-600 transition">
              {hotel.name}
            </h3>
          </div>

          {/* Location */}
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <MapPinIcon className="h-4 w-4 text-brand-500" />
            <span className="truncate">{hotel.location}</span>
          </p>

          {/* Ratings badge */}
          {rating !== null ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-0.5 rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                <StarIcon className="h-3.5 w-3.5 text-gold-500" filled />
                {rating.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {getRatingLabel(rating)}
              </span>
              <span className="text-xs text-slate-400">
                ({reviewCount.toLocaleString("en-US")} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 font-medium">
              <StarIcon className="h-3.5 w-3.5 text-slate-300" />
              <span>No ratings yet</span>
            </div>
          )}

          {/* Amenity Icons Row */}
          {displayAmenities.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              {displayAmenities.slice(0, 5).map((amenity, idx) => {
                const IconComp = amenity.icon;
                return (
                  <div
                    key={idx}
                    title={amenity.label}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-500"
                  >
                    <IconComp className="h-4 w-4" />
                  </div>
                );
              })}
              {displayAmenities.length > 5 && (
                <span className="text-xs font-semibold text-slate-400">
                  +{displayAmenities.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {hasFreeBreakfast && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Free breakfast
              </span>
            )}
            {hasFreeCancellation && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Free cancellation
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="my-4 border-slate-100" />

        {/* Price & Actions Section */}
        <div className="flex items-end justify-between gap-4 mt-auto">
          <div className="flex flex-col">
            {minPrice !== null ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900">
                    ₹{minPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-500">/ night</span>
                </div>
                {totalWithTax !== null && (
                  <span className="text-xs text-slate-400 mt-0.5">
                    Total ₹{Math.round(totalWithTax).toLocaleString("en-IN")} incl. taxes
                    {nights > 1 ? ` (for ${nights} nights)` : ""}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-400 font-semibold">
                Price on request
              </span>
            )}
          </div>

          <Link
            href={`/hotels/${hotel.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
