"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  MapPin, 
  Mountain, 
  Waves, 
  Building2, 
  Landmark 
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface Destination {
  name: string;
  stays: string;
}

interface DestinationsSectionProps {
  destinations: Destination[];
}

export interface StyleConfig {
  icon: any;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBgClass: string;
  iconColorClass: string;
  tagClass: string;
}

export function getDestinationStyle(cityName: string): StyleConfig {
  const name = cityName.toLowerCase();
  
  // Hills / Mountains / Nature
  if (["munnar", "coorg", "wayanad", "ladakh", "manali", "kodaikanal", "ooty"].some(c => name.includes(c))) {
    return {
      icon: Mountain,
      bgClass: "bg-gradient-to-br from-emerald-50/60 to-teal-50/40 hover:from-emerald-100/70 hover:to-teal-100/50",
      borderClass: "border-emerald-100/80",
      textClass: "text-emerald-950",
      iconBgClass: "bg-emerald-100/80",
      iconColorClass: "text-emerald-700",
      tagClass: "text-emerald-700/80 bg-emerald-100/40"
    };
  }
  
  // Beach / Backwaters / River
  if (["alleppey", "alappuzha", "kovalam", "varkala", "kochi", "ernakulam", "goa", "kollam", "munambam", "calicut", "mahabalipuram", "kottayam"].some(c => name.includes(c))) {
    return {
      icon: Waves,
      bgClass: "bg-gradient-to-br from-sky-50/60 to-blue-50/40 hover:from-sky-100/70 hover:to-blue-100/50",
      borderClass: "border-sky-100/80",
      textClass: "text-sky-950",
      iconBgClass: "bg-sky-100/80",
      iconColorClass: "text-sky-700",
      tagClass: "text-sky-700/80 bg-sky-100/40"
    };
  }
  
  // Heritage / Cultural / Palaces
  if (["mysore", "hampi", "udaipur", "jaipur", "madurai"].some(c => name.includes(c))) {
    return {
      icon: Landmark,
      bgClass: "bg-gradient-to-br from-amber-50/60 to-orange-50/40 hover:from-amber-100/70 hover:to-orange-100/50",
      borderClass: "border-amber-100/80",
      textClass: "text-amber-950",
      iconBgClass: "bg-amber-100/80",
      iconColorClass: "text-amber-700",
      tagClass: "text-amber-700/80 bg-amber-100/40"
    };
  }
  
  // Metro / Business Cities
  if (["bangalore", "chennai", "mumbai", "delhi", "coimbatore", "noida", "gurugram"].some(c => name.includes(c))) {
    return {
      icon: Building2,
      bgClass: "bg-gradient-to-br from-slate-50/60 to-zinc-100/40 hover:from-slate-100/70 hover:to-zinc-200/50",
      borderClass: "border-slate-200/80",
      textClass: "text-slate-950",
      iconBgClass: "bg-slate-200/80",
      iconColorClass: "text-slate-700",
      tagClass: "text-slate-700/80 bg-slate-200/40"
    };
  }
  
  // Default
  return {
    icon: MapPin,
    bgClass: "bg-gradient-to-br from-stone-50/60 to-neutral-100/40 hover:from-stone-100/70 hover:to-neutral-200/50",
    borderClass: "border-stone-200/80",
    textClass: "text-stone-950",
    iconBgClass: "bg-stone-200/80",
    iconColorClass: "text-stone-700",
    tagClass: "text-stone-700/80 bg-stone-200/40"
  };
}

export function DestinationsSection({ destinations }: DestinationsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [destinations]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const visibleDestinations = destinations.slice(0, 10);
  const hasMore = destinations.length > 10;

  const filteredDestinations = destinations.filter((dest) =>
    dest.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="relative z-10 mx-auto max-w-7xl w-full px-4 py-12 border-t border-slate-200/60">
      <div className="mb-8 flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">Popular destinations</h2>
          <p className="mt-1 text-sm text-slate-500 font-bold">
            Explore stays in India&apos;s most popular travel getaways.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm font-black text-brand-700 hover:text-brand-600 transition flex items-center gap-1 group cursor-pointer bg-transparent border-none outline-none font-sans"
        >
          Explore all destinations
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="relative group/scroll">
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

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4 select-none"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleDestinations.map((dest) => {
            const style = getDestinationStyle(dest.name);
            const Icon = style.icon;
            
            return (
              <Link
                key={dest.name}
                href={`/?location=${dest.name}#hotels`}
                className={`relative flex-none snap-start w-[190px] h-[130px] rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group ${style.bgClass} ${style.borderClass}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${style.iconBgClass}`}>
                    <Icon className={`h-4.5 w-4.5 ${style.iconColorClass}`} />
                  </div>
                </div>
                <div>
                  <p className={`font-black leading-tight text-base font-serif ${style.textClass}`}>{dest.name}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">{dest.stays}</p>
                </div>
              </Link>
            );
          })}

          {/* Show More Card */}
          {hasMore && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative flex-none snap-start w-[190px] h-[130px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-100/50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ChevronRight className="h-4 w-4" />
              </div>
              <p className="font-black text-slate-850 text-xs">Show More</p>
              <p className="text-[10px] text-slate-500 font-bold">+{destinations.length - 10} locations</p>
            </button>
          )}
        </div>
      </div>

      {/* Modal / Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 font-serif">All Destinations</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Explore stays in {destinations.length} popular locations</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5">
                <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-slate-800 outline-none w-full placeholder:text-slate-400 py-1"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Destinations Grid */}
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {filteredDestinations.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredDestinations.map((dest) => {
                      const style = getDestinationStyle(dest.name);
                      const Icon = style.icon;

                      return (
                        <Link
                          key={dest.name}
                          href={`/?location=${dest.name}#hotels`}
                          onClick={() => setIsModalOpen(false)}
                          className={`relative flex flex-col justify-between h-[110px] rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer group ${style.bgClass} ${style.borderClass}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${style.iconBgClass}`}>
                              <Icon className={`h-4 w-4 ${style.iconColorClass}`} />
                            </div>
                          </div>
                          <div>
                            <p className={`font-bold leading-tight text-sm font-serif ${style.textClass}`}>{dest.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{dest.stays}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-base">No destinations found</p>
                    <p className="text-xs text-slate-500 mt-1">Try searching for a different city or region.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
