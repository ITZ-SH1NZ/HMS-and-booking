"use client";

import Image from "next/image";
import { StarIcon, PencilIcon, MapPinIcon } from "@/components/icons";
import type { HotelDraft, HotelPhoto } from "@/lib/types";

interface ListingPreviewProps {
  draft: HotelDraft | null;
  photos: HotelPhoto[];
  onEditPhotosClick?: () => void;
}

export default function ListingPreview({
  draft,
  photos,
  onEditPhotosClick,
}: ListingPreviewProps) {
  const coverPhoto = photos.find((p) => p.category === "cover");
  const imageUrl = coverPhoto ? coverPhoto.url : null;

  // Format languages spoken
  const languagesStr =
    draft?.languages_spoken && draft.languages_spoken.length > 0
      ? draft.languages_spoken.join(", ")
      : "Not specified";

  // Format best for
  const bestForStr =
    draft?.best_for && draft.best_for.length > 0
      ? draft.best_for.join(", ")
      : "Not specified";

  // Location display
  let locationStr = "Property location";
  if (draft?.city || draft?.state || draft?.country) {
    const parts = [draft.city, draft.state, draft.country].filter(Boolean);
    locationStr = parts.join(", ");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-sm">Listing preview</h3>
        <button
          type="button"
          onClick={onEditPhotosClick}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          See full preview &rarr;
        </button>
      </div>

      {/* Image Container */}
      <div className="relative aspect-[1.6/1] w-full rounded-xl overflow-hidden bg-slate-100 mb-4 border border-slate-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Property Cover Preview"
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <span className="text-xs font-medium">No cover image uploaded</span>
          </div>
        )}
        {onEditPhotosClick && (
          <button
            type="button"
            onClick={onEditPhotosClick}
            className="absolute top-3 right-3 p-2 bg-white rounded-full text-slate-700 hover:bg-slate-50 shadow transition"
            title="Edit photos"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Basic Text Details */}
      <div className="space-y-1">
        <h4 className="font-bold text-lg text-slate-900 leading-tight">
          {draft?.name || "Untitled Property"}
        </h4>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPinIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="truncate">{locationStr}</span>
        </p>
      </div>

      {/* Stars & Category */}
      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-0.5 text-amber-400">
          <StarIcon className="h-4 w-4" filled />
          <span className="text-xs font-bold text-slate-800 ml-1">
            {draft?.star_rating || 0}.0
          </span>
          <span className="text-xs text-slate-400 ml-0.5">(128 reviews)</span>
        </div>
        {draft?.property_type && (
          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            {draft.star_rating || 4} Star {draft.property_type}
          </span>
        )}
      </div>

      {/* Grid of specifications */}
      <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Property type</span>
          <span className="text-slate-800 font-semibold">
            {draft?.property_type || "Not specified"}
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-slate-500 font-medium shrink-0">Languages</span>
          <span className="text-slate-800 font-semibold truncate text-right">
            {languagesStr}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Year built</span>
          <span className="text-slate-800 font-semibold">
            {draft?.year_built || "Not specified"}
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-slate-500 font-medium shrink-0">Best for</span>
          <span className="text-slate-800 font-semibold truncate text-right">
            {bestForStr}
          </span>
        </div>
      </div>
    </div>
  );
}
