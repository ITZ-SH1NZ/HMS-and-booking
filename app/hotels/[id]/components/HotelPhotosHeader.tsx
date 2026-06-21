"use client";

import { useState } from "react";
import { PhotoCollage } from "./PhotoCollage";
import { GalleryModal } from "./GalleryModal";
import type { HotelPhoto } from "@/lib/types";

interface HotelPhotosHeaderProps {
  photos: HotelPhoto[];
  hotelName: string;
  fallbackImage: string | null;
  avgRating: number | null;
  reviewCount: number;
  isGuestFavourite: boolean;
}

export function HotelPhotosHeader({
  photos,
  hotelName,
  fallbackImage,
  avgRating,
  reviewCount,
  isGuestFavourite,
}: HotelPhotosHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PhotoCollage
        photos={photos}
        hotelName={hotelName}
        fallbackImage={fallbackImage}
        avgRating={avgRating}
        reviewCount={reviewCount}
        isGuestFavourite={isGuestFavourite}
        onViewAll={() => setOpen(true)}
      />
      <GalleryModal
        photos={photos}
        hotelName={hotelName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
