"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, CameraIcon } from "@/components/icons";
import type { HotelPhoto } from "@/lib/types";

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

interface GalleryModalProps {
  photos: HotelPhoto[];
  hotelName: string;
  open: boolean;
  onClose: () => void;
}

export function GalleryModal({ photos, hotelName, open, onClose }: GalleryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleClose = useCallback(() => {
    setActiveIndex(0);
    setActiveCategory("all");
    onClose();
  }, [onClose]);

  // Group photos by category
  const categories = ["all", ...Array.from(new Set(photos.map((p) => p.category)))];
  const filteredPhotos =
    activeCategory === "all" ? photos : photos.filter((p) => p.category === activeCategory);

  // Open/close the native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      try {
        dialog.close();
      } catch {}
    }
  }, [open]);

  // Handle native dialog cancel (Esc key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      handleClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleClose]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % filteredPhotos.length);
  }, [filteredPhotos.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + filteredPhotos.length) % filteredPhotos.length);
  }, [filteredPhotos.length]);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, goNext, goPrev]);

  const selectCategory = (cat: string) => {
    setActiveCategory(cat);
    setActiveIndex(0);
  };

  const currentPhoto = filteredPhotos[activeIndex];

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-screen w-screen max-h-screen max-w-full bg-slate-950/95 p-0 backdrop:bg-transparent open:flex open:flex-col"
      aria-label={`${hotelName} photo gallery`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold text-lg">{hotelName}</h2>
          <span className="text-white/50 text-sm">
            {activeIndex + 1} / {filteredPhotos.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Close gallery"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto scrollbar-thin border-b border-white/5">
        {categories.map((cat) => {
          const label = cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat;
          const count =
            cat === "all" ? photos.length : photos.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition cursor-pointer ${
                activeCategory === cat
                  ? "bg-white text-slate-900"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4 py-4">
        {/* Prev button */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-sm"
          aria-label="Previous photo"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        {/* Photo */}
        {currentPhoto ? (
          <Image
            src={currentPhoto.url}
            alt={`${hotelName} — ${CATEGORY_LABELS[currentPhoto.category] || currentPhoto.category}`}
            width={1920}
            height={1280}
            sizes="100vw"
            style={{ width: "auto", height: "auto" }}
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-white/30 text-center">
            <CameraIcon className="h-16 w-16 mx-auto mb-2" />
            <p className="text-sm">No photos in this category</p>
          </div>
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-sm"
          aria-label="Next photo"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="px-6 py-3 border-t border-white/10 overflow-x-auto">
        <div className="flex gap-2">
          {filteredPhotos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition ${
                idx === activeIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <Image
                src={photo.url}
                alt={`Thumbnail ${idx + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
