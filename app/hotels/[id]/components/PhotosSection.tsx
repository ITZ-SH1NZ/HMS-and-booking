"use client";

import { useState } from "react";
import Image from "next/image";
import type { HotelPhoto } from "@/lib/types";
import { Section } from "./SectionWrapper";
import { CameraIcon } from "@/components/icons";
import { GalleryModal } from "./GalleryModal";

interface PhotosSectionProps {
  photos: HotelPhoto[];
  hotelName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cover: "Cover Photo",
  exterior: "Exterior",
  lobby: "Lobby & Reception",
  rooms: "Rooms & Suites",
  restaurant: "Dining & Restaurant",
  pool: "Pool & Recreation",
  amenities: "Amenities",
  bathroom: "Bathrooms",
  other: "Other Spaces",
};

export function PhotosSection({ photos, hotelName }: PhotosSectionProps) {
  const [open, setOpen] = useState(false);

  if (photos.length === 0) return null;

  // Group photos by category
  const categories = Array.from(new Set(photos.map((p) => p.category)));

  return (
    <Section id="photos" title="Photos">
      <div className="space-y-8">
        {categories.map((cat) => {
          const catPhotos = photos.filter((p) => p.category === cat);
          if (catPhotos.length === 0) return null;

          return (
            <div key={cat} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {catPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setOpen(true)}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer"
                  >
                    <Image
                      src={photo.url}
                      alt={`${hotelName} — ${CATEGORY_LABELS[cat] || cat}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 300px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition duration-300" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
        >
          <CameraIcon className="h-4.5 w-4.5 text-slate-500" />
          Open Fullscreen Photo Gallery ({photos.length} photos)
        </button>
      </div>

      <GalleryModal
        photos={photos}
        hotelName={hotelName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Section>
  );
}
