"use client";

import { useState } from "react";
import Image from "next/image";
import { StarIcon, CameraIcon } from "@/components/icons";
import type { HotelPhoto } from "@/lib/types";

interface PhotoCollageProps {
  photos: HotelPhoto[];
  hotelName: string;
  fallbackImage: string | null;
  avgRating: number | null;
  reviewCount: number;
  isGuestFavourite: boolean;
  onViewAll: () => void;
}

// Maps photo category to a display label
const CATEGORY_LABELS: Record<string, string> = {
  cover: "Cover",
  exterior: "Exterior",
  lobby: "Lobby",
  rooms: "Rooms",
  restaurant: "Restaurant",
  pool: "Pool",
  amenities: "Amenities",
  bathroom: "Bathroom",
  other: "Other",
};

export function PhotoCollage({
  photos,
  hotelName,
  fallbackImage,
  avgRating,
  reviewCount,
  isGuestFavourite,
  onViewAll,
}: PhotoCollageProps) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Get the cover photo first, then fill with other categories
  const coverPhoto = photos.find((p) => p.category === "cover");
  const otherPhotos = photos.filter((p) => p.category !== "cover");

  // Build the collage: cover on left, up to 4 thumbnails on right
  const mainImage = coverPhoto?.url || fallbackImage;
  const gridPhotos = otherPhotos.slice(0, 4);
  const totalPhotos = photos.length;
  const remainingCount = Math.max(0, totalPhotos - 5); // 1 cover + 4 grid

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  if (!mainImage && photos.length === 0) {
    // No photos at all — show a placeholder
    return (
      <div className="relative rounded-2xl overflow-hidden bg-slate-100 h-[420px] grid place-items-center">
        <div className="text-center text-slate-400">
          <CameraIcon className="h-16 w-16 mx-auto mb-2" />
          <p className="text-sm font-medium">No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[320px] md:h-[420px]">
        {/* Main cover image — left half */}
        <div
          onClick={onViewAll}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onViewAll();
            }
          }}
          role="button"
          tabIndex={0}
          className="relative group cursor-pointer overflow-hidden h-full outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-l-2xl md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1"
        >
          {mainImage && !imgErrors.has("cover") ? (
            <Image
              src={mainImage}
              alt={hotelName}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => handleImgError("cover")}
            />
          ) : (
            <div className="h-full w-full bg-slate-200 grid place-items-center">
              <CameraIcon className="h-12 w-12 text-slate-300" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {avgRating !== null && (
              <span className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-white">
                <StarIcon className="h-4 w-4 text-amber-400" filled />
                {avgRating} ({reviewCount} review{reviewCount === 1 ? "" : "s"})
              </span>
            )}
            {isGuestFavourite && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm">
                <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Guest favourite
              </span>
            )}
          </div>

          {/* View all photos button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewAll();
            }}
            className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-900 shadow-md hover:bg-white transition cursor-pointer"
          >
            <CameraIcon className="h-4 w-4" />
            View all photos
          </button>
        </div>

        {/* Thumbnails (hidden on mobile, grid items on desktop) */}
        {gridPhotos.map((photo, index) => {
          const isLast = index === 3 && remainingCount > 0;
          // Explicit grid positioning classes for each thumbnail on desktop to prevent auto-wrap stretching
          const positionClasses = [
            "md:col-start-3 md:row-start-1",
            "md:col-start-4 md:row-start-1",
            "md:col-start-3 md:row-start-2",
            "md:col-start-4 md:row-start-2",
          ][index] || "";

          return (
            <button
              key={photo.id}
              type="button"
              onClick={onViewAll}
              className={`relative group cursor-pointer overflow-hidden hidden md:block col-span-1 row-span-1 h-full w-full border-0 p-0 ${positionClasses}`}
            >
              {!imgErrors.has(photo.id) ? (
                <Image
                  src={photo.url}
                  alt={`${hotelName} — ${CATEGORY_LABELS[photo.category] || photo.category}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => handleImgError(photo.id)}
                />
              ) : (
                <div className="h-full w-full bg-slate-200 grid place-items-center">
                  <CameraIcon className="h-8 w-8 text-slate-300" />
                </div>
              )}

              {/* Category label */}
              <span className="absolute bottom-2 left-2 rounded bg-black/50 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white">
                {CATEGORY_LABELS[photo.category] || photo.category}
              </span>

              {/* +N more overlay on last tile */}
              {isLast && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] grid place-items-center">
                  <span className="text-white text-lg font-bold">
                    +{remainingCount}
                    <span className="block text-xs font-medium">more photos</span>
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Fill empty grid slots if fewer than 4 photos (hidden on mobile, grid items on desktop) */}
        {Array.from({ length: Math.max(0, 4 - gridPhotos.length) }).map((_, i) => {
          const index = gridPhotos.length + i;
          const positionClasses = [
            "md:col-start-3 md:row-start-1",
            "md:col-start-4 md:row-start-1",
            "md:col-start-3 md:row-start-2",
            "md:col-start-4 md:row-start-2",
          ][index] || "";

          return (
            <div
              key={`empty-${i}`}
              className={`bg-slate-100 hidden md:grid place-items-center col-span-1 row-span-1 h-full w-full ${positionClasses}`}
            >
              <CameraIcon className="h-8 w-8 text-slate-200" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
