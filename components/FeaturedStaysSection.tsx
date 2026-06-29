"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { HotelCard } from "@/components/HotelCard";
import type { HotelCardData } from "@/lib/types";

interface FeaturedStaysSectionProps {
  hotels: HotelCardData[];
  totalCount: number;
}

export function FeaturedStaysSection({ hotels, totalCount }: FeaturedStaysSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  // Track scroll metrics for pagination dots
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft: left, scrollWidth: width, clientWidth: client } = scrollRef.current;
      setScrollLeft(left);
      setScrollWidth(width);
      setClientWidth(client);
      setShowLeftArrow(left > 10);
      setShowRightArrow(left < width - client - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      // Run initial check
      checkScroll();
      // Handle resize events
      window.addEventListener("resize", checkScroll);
      
      // A small timeout to ensure DOM layout has completed and scrollWidth is accurate
      const timer = setTimeout(checkScroll, 150);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
        clearTimeout(timer);
      };
    }
  }, [hotels]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth: client } = scrollRef.current;
      const scrollAmount = direction === "left" ? -client * 0.75 : client * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Pagination Math
  const maxScroll = scrollWidth - clientWidth;
  const stepSize = clientWidth * 0.75;
  const numPages = maxScroll > 0 && stepSize > 0 ? Math.ceil(maxScroll / stepSize) + 1 : 0;
  const activeIndex = stepSize > 0 ? Math.min(Math.round(scrollLeft / stepSize), numPages - 1) : 0;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="relative group/scroll-stays">
        {/* Left Arrow */}
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("left")}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 grid place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-700 hover:shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right Arrow */}
        <AnimatePresence>
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("right")}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 grid place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-700 hover:shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4 pt-2"
          style={{ scrollbarWidth: "none" }}
        >
          {hotels.map((hotel) => (
            <div key={hotel.id} className="flex-none snap-start w-[290px] sm:w-[310px]">
              <HotelCard hotel={hotel} />
            </div>
          ))}

          {/* Show More Card at the end of the scroll view */}
          {totalCount > 10 && (
            <div className="flex-none snap-start w-[290px] sm:w-[310px]">
              <Link
                href="/hotels"
                className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-3xl p-6 h-[410px] bg-slate-50/50 hover:bg-slate-100/80 hover:border-brand-500 transition-all duration-350 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="h-14 w-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <p className="font-black text-slate-800 text-base font-serif">Show More Stays</p>
                <p className="text-xs text-slate-500 font-bold mt-1.5 text-center px-4">
                  Explore all {totalCount} available properties
                </p>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sleek, Modern Scroll Progress Bar */}
      {maxScroll > 0 && (
        <div className="w-36 h-[3px] bg-slate-200/80 rounded-full mx-auto mt-2 overflow-hidden relative select-none">
          <div
            className="absolute left-0 top-0 bottom-0 bg-brand-700 rounded-full transition-all duration-150"
            style={{ width: `${Math.min(Math.max((scrollLeft / maxScroll) * 100, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
