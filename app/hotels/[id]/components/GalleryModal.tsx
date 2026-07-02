"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
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
  const [direction, setDirection] = useState<number>(0); // -1 for left, 1 for right

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
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    } else {
      try {
        dialog.close();
      } catch {}
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
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
    setDirection(1);
    setActiveIndex((i) => (i + 1) % filteredPhotos.length);
  }, [filteredPhotos.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
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

  // Motion variants for slide/fade image transitions
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.3 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-screen w-screen max-h-screen max-w-full bg-[#030712]/92 p-0 backdrop:bg-transparent open:flex open:flex-col overflow-hidden outline-none border-0"
      aria-label={`${hotelName} photo gallery`}
    >
      {/* Ambient background glows for 3D depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Floating Glass Header */}
      <div className="relative z-10 mx-6 mt-6 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-medium tracking-wide text-base sm:text-lg">{hotelName}</h2>
          <span className="bg-white/10 text-white/90 text-xs font-mono px-2.5 py-1 rounded-md border border-white/[0.05]">
            {activeIndex + 1} / {filteredPhotos.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="grid h-10 w-10 place-items-center rounded-xl text-white/70 border border-white/[0.08] bg-white/[0.02] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95"
          aria-label="Close gallery"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Boutique Category Tabs */}
      <div className="relative z-10 flex gap-2 px-6 mt-4 pb-3 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const label = cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat;
          const count =
            cat === "all" ? photos.length : photos.filter((p) => p.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer border ${
                isActive
                  ? "bg-white text-slate-950 border-white shadow-xl shadow-white/5 font-semibold scale-105"
                  : "bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/15 active:scale-95"
              }`}
            >
              {label}
              <span
                className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                  isActive ? "bg-slate-100 text-slate-800" : "bg-white/10 text-white/50"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Image Cinematic Viewport */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4 md:px-20 py-4 select-none">
        {/* Prev Floating Glass Button */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-6 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg active:scale-90 cursor-pointer"
          aria-label="Previous photo"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        {/* Cinematic Framed Photo Viewport */}
        <div className="w-full h-full max-w-5xl max-h-[70vh] flex items-center justify-center relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-black/40">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {currentPhoto ? (
              <motion.div
                key={currentPhoto.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full h-full flex items-center justify-center p-2"
              >
                <Image
                  src={currentPhoto.url}
                  alt={`${hotelName} — ${CATEGORY_LABELS[currentPhoto.category] || currentPhoto.category}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 1200px"
                  style={{ objectFit: "contain" }}
                  className="max-h-full max-w-full select-none"
                  priority
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/30 text-center"
              >
                <CameraIcon className="h-16 w-16 mx-auto mb-2" />
                <p className="text-sm">No photos in this category</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Next Floating Glass Button */}
        <button
          type="button"
          onClick={goNext}
          className="absolute right-6 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg active:scale-90 cursor-pointer"
          aria-label="Next photo"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Glassmorphic Thumbnail Strip Container */}
      <div className="relative z-10 mt-auto bg-slate-950/40 backdrop-blur-xl border-t border-white/[0.06] py-5 px-6">
        <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="flex gap-3 justify-start sm:justify-center">
            {filteredPhotos.map((photo, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setDirection(idx > activeIndex ? 1 : -1);
                    setActiveIndex(idx);
                  }}
                  className={`relative shrink-0 h-16 w-24 rounded-xl overflow-hidden transition-all duration-300 border-2 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 scale-105 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 opacity-100"
                      : "border-transparent opacity-40 grayscale hover:opacity-90 hover:grayscale-0 hover:scale-102"
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
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}
