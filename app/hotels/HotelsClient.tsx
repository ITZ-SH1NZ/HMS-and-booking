"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { parseAmenities } from "@/lib/hotelDraft";
import ExploreFilters, { FilterState } from "./ExploreFilters";
import ExploreHotelCard from "./ExploreHotelCard";
import { motion, AnimatePresence } from "motion/react";
import { RangeCalendar } from "@/components/RangeCalendar";

const longDate = (s: string) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "Add date";
import {
  StarIcon,
  MapPinIcon,
  SearchIcon,
  CalendarIcon,
  UserIcon,
  ChevronDownIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/icons";

// Dynamically import map client-side
const ExploreMap = dynamic(() => import("./ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-cream-50 animate-pulse flex items-center justify-center text-slate-400 font-semibold">
      Loading map...
    </div>
  ),
});

interface HotelsClientProps {
  hotels: any[];
}

const AMENITY_MAPPINGS = [
  { label: "Swimming Pool", keys: ["pool", "swimming pool", "swimming_pool"] },
  { label: "Free Wi-Fi", keys: ["wifi", "free wi-fi", "free_wifi", "wi-fi"] },
  { label: "Breakfast included", keys: ["breakfast", "breakfast included", "breakfast_buffet", "free breakfast", "free_breakfast"] },
  { label: "Sea View", keys: ["sea view", "beachfront", "beach view"] },
  { label: "Spa", keys: ["spa", "spa & massage", "spa_massage"] },
  { label: "Gym", keys: ["gym", "fitness center / gym", "fitness_center"] },
  { label: "Parking", keys: ["parking", "free parking"] },
];

function DateInput({
  value,
  min,
  onChange,
  placeholder,
}: {
  value: string;
  min?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  function openPicker(el: HTMLInputElement) {
    el.type = "date";
    try {
      el.showPicker?.();
    } catch {}
  }

  return (
    <input
      type={value ? "date" : "text"}
      value={value}
      min={min}
      onChange={onChange}
      placeholder={placeholder || "Add date"}
      onFocus={(e) => openPicker(e.currentTarget)}
      onClick={(e) => openPicker(e.currentTarget)}
      onBlur={(e) => {
        if (!e.currentTarget.value) e.currentTarget.type = "text";
      }}
      className="w-full cursor-pointer bg-transparent text-sm font-extrabold text-slate-805 outline-none placeholder:text-slate-400 mt-0.5"
    />
  );
}

function GuestRow({
  label,
  sub,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex flex-col text-left">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        <span className="text-xs text-slate-400 font-medium">{sub}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="w-4 text-center text-sm font-bold text-slate-800">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 cursor-pointer"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function HotelsClient({ hotels }: { hotels: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters from homepage
  const locationParam = searchParams.get("location") ?? "";
  const checkInParam = searchParams.get("checkIn") ?? "";
  const checkOutParam = searchParams.get("checkOut") ?? "";
  const guestsParam = searchParams.get("guests") ?? "1";

  // Interactive search state
  const [localLocation, setLocalLocation] = useState(locationParam);
  const [localCheckIn, setLocalCheckIn] = useState(checkInParam);
  const [localCheckOut, setLocalCheckOut] = useState(checkOutParam);
  const [localGuests, setLocalGuests] = useState(guestsParam);
  const [guests, setGuests] = useState({
    adults: Math.max(1, Number(guestsParam) || 1),
    children: 0,
    infants: 0,
  });
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<"where" | "dates" | "guests" | null>(null);
  const [activeMobileSegment, setActiveMobileSegment] = useState<"where" | "dates" | "guests" | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalLocation(locationParam);
    setLocalCheckIn(checkInParam);
    setLocalCheckOut(checkOutParam);
    setLocalGuests(guestsParam);
    setGuests({
      adults: Math.max(1, Number(guestsParam) || 1),
      children: 0,
      infants: 0,
    });
  }, [locationParam, checkInParam, checkOutParam, guestsParam]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setActiveSegment(null);
        setActiveMobileSegment(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const suggestions = useMemo(() => {
    const locsSet = new Set<string>();
    hotels.forEach((h) => {
      if (h.location) locsSet.add(h.location.trim());
      if (h.city) locsSet.add(h.city.trim());
    });
    return Array.from(locsSet).filter(Boolean);
  }, [hotels]);

  const filteredSuggestions = useMemo(() => {
    const displaySuggestions = suggestions.length > 0
      ? suggestions
      : ["Goa", "Kerala", "Ladakh", "Udaipur", "Manali", "Jaipur"];
    return displaySuggestions.filter((s) =>
      localLocation ? s.toLowerCase().includes(localLocation.toLowerCase()) : true
    );
  }, [suggestions, localLocation]);

  const totalGuestCount = guests.adults + guests.children;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    
    if (localLocation) params.set("location", localLocation);
    else params.delete("location");
    
    if (localCheckIn) params.set("checkIn", localCheckIn);
    else params.delete("checkIn");
    
    if (localCheckOut) params.set("checkOut", localCheckOut);
    else params.delete("checkOut");
    
    params.set("guests", String(totalGuestCount));
    
    setActiveSegment(null);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const handleSelectHotelFromMap = (id: string | null) => {
    setSelectedHotelId(id);
    if (id) {
      setTimeout(() => {
        const el = document.getElementById(`hotel-card-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  // Search details formatted for header summary
  const formattedDates = useMemo(() => {
    if (!checkInParam || !checkOutParam) return "Add dates";
    const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    const inD = new Date(checkInParam);
    const outD = new Date(checkOutParam);
    const inStr = `${inD.getDate()} ${months[inD.getMonth()] || "Jun"}`;
    const outStr = `${outD.getDate()} ${months[outD.getMonth()] || "Jun"}`;
    const diff = outD.getTime() - inD.getTime();
    const nights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
    return `${inStr} – ${outStr} · ${nights} ${nights === 1 ? "night" : "nights"}`;
  }, [checkInParam, checkOutParam]);

  // Client States
  const [viewMode, setViewMode] = useState<"list" | "map">("map"); // Default split-screen map on desktop
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("recommended");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<"none" | "filters" | "sort">("none");

  // Read URL active filter states (pre-fills from sharing links)
  const [filters, setFilters] = useState<FilterState>(() => {
    const minPrice = Number(searchParams.get("minPrice") ?? "0");
    const maxPrice = Number(searchParams.get("maxPrice") ?? "20000");
    const types = searchParams.get("types") ? searchParams.get("types")!.split(",") : [];
    const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : null;
    const amenities = searchParams.get("amenities") ? searchParams.get("amenities")!.split(",") : [];
    const freeCancellation = searchParams.get("cancellation") === "flexible";

    return {
      priceRange: [minPrice, maxPrice],
      propertyTypes: types,
      minRating: rating,
      amenities: amenities,
      freeCancellation,
    };
  });

  // Track property type category selection from horiz scroll strip
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("All");

  // Sync state changes with URL parameters smoothly
  const syncFiltersToUrl = (newFilters: FilterState, newSort: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("minPrice", newFilters.priceRange[0].toString());
    params.set("maxPrice", newFilters.priceRange[1].toString());

    if (newFilters.propertyTypes.length) {
      params.set("types", newFilters.propertyTypes.join(","));
    } else {
      params.delete("types");
    }

    if (newFilters.minRating) {
      params.set("rating", newFilters.minRating.toString());
    } else {
      params.delete("rating");
    }

    if (newFilters.amenities.length) {
      params.set("amenities", newFilters.amenities.join(","));
    } else {
      params.delete("amenities");
    }

    if (newFilters.freeCancellation) {
      params.set("cancellation", "flexible");
    } else {
      params.delete("cancellation");
    }

    if (newSort !== "recommended") {
      params.set("sortBy", newSort);
    } else {
      params.delete("sortBy");
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, as: nextUrl, url: nextUrl }, "", nextUrl);
  };

  const handleFilterChange = (updated: FilterState) => {
    setFilters(updated);
    syncFiltersToUrl(updated, sortBy);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    syncFiltersToUrl(filters, newSort);
  };

  const resetFilters = () => {
    const resetState: FilterState = {
      priceRange: [0, 20000],
      propertyTypes: [],
      minRating: null,
      amenities: [],
      freeCancellation: false,
    };
    setFilters(resetState);
    setActiveCategoryTab("All");
    syncFiltersToUrl(resetState, sortBy);
  };

  // Quick category tabs action
  const handleCategoryTabSelect = (tab: string) => {
    setActiveCategoryTab(tab);
    if (tab === "All") {
      handleFilterChange({ ...filters, propertyTypes: [] });
    } else if (tab === "Beachfront") {
      // Beachfront is mapped to an amenity/highlight filter
      const hasSeaView = filters.amenities.includes("Sea View");
      const updatedAmenities = hasSeaView ? filters.amenities : [...filters.amenities, "Sea View"];
      handleFilterChange({ ...filters, propertyTypes: [], amenities: updatedAmenities });
    } else {
      // Standard property types
      handleFilterChange({ ...filters, propertyTypes: [tab] });
    }
  };

  // 1. Filter Logic
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      // Search parameter filter (location)
      if (locationParam && !hotel.location.toLowerCase().includes(locationParam.toLowerCase())) {
        return false;
      }

      // 1. Price per night filter
      const prices = hotel.rooms?.map((r: any) => Number(r.price)) ?? [];
      const minPrice = prices.length ? Math.min(...prices) : 0;
      if (minPrice < filters.priceRange[0] || minPrice > filters.priceRange[1]) {
        return false;
      }

      // 2. Property types filter
      if (filters.propertyTypes.length > 0) {
        if (!hotel.property_type || !filters.propertyTypes.some(t => t.toLowerCase() === hotel.property_type.toLowerCase())) {
          return false;
        }
      }

      // 3. Guest ratings filter
      const rating = hotel.reviews?.length
        ? hotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / hotel.reviews.length
        : hotel.rating ?? 0;
      if (filters.minRating && rating < filters.minRating) {
        return false;
      }

      // 4. Cancellation policy filter
      if (filters.freeCancellation && hotel.cancellation_policy !== "flexible") {
        return false;
      }

      // 5. Amenities filter
      const hotelAmens = parseAmenities(hotel.amenities).map((a) => a.toLowerCase());
      const hasAllAmenities = filters.amenities.every((amenityLabel) => {
        const mapping = AMENITY_MAPPINGS.find(m => m.label === amenityLabel);
        if (!mapping) return false;
        return mapping.keys.some(k => hotelAmens.some(ha => ha.includes(k)));
      });
      if (!hasAllAmenities) {
        return false;
      }

      return true;
    });
  }, [hotels, filters, locationParam]);

  // 2. Sort Logic
  const sortedHotels = useMemo(() => {
    const list = [...filteredHotels];
    if (sortBy === "price-asc") {
      list.sort((a, b) => {
        const pA = a.rooms?.length ? Math.min(...a.rooms.map((r: any) => Number(r.price))) : Infinity;
        const pB = b.rooms?.length ? Math.min(...b.rooms.map((r: any) => Number(r.price))) : Infinity;
        return pA - pB;
      });
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => {
        const pA = a.rooms?.length ? Math.min(...a.rooms.map((r: any) => Number(r.price))) : -Infinity;
        const pB = b.rooms?.length ? Math.min(...b.rooms.map((r: any) => Number(r.price))) : -Infinity;
        return pB - pA;
      });
    } else if (sortBy === "rating") {
      list.sort((a, b) => {
        const rA = a.reviews?.length ? (a.reviews.reduce((acc: number, val: any) => acc + val.rating, 0) / a.reviews.length) : (a.rating ?? 0);
        const rB = b.reviews?.length ? (b.reviews.reduce((acc: number, val: any) => acc + val.rating, 0) / b.reviews.length) : (b.rating ?? 0);
        return rB - rA;
      });
    } else {
      // default: recommended / new
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [filteredHotels, sortBy]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4 bg-cream-50 text-slate-800 min-h-screen">
      {/* 1. Header Summary Banner (Desktop: full form, Mobile: compact trigger) */}
      <div ref={calendarRef} className="mb-6 sticky top-[60px] md:relative md:top-0 z-30">
        {/* Mobile Compact Trigger */}
        <div
          onClick={() => setIsMobileSearchOpen(true)}
          className="md:hidden w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <SearchIcon className="h-5 w-5 text-brand-500 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-800">
                {localLocation || "Anywhere"}
              </span>
              <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                {formattedDates} · {localGuests} {Number(localGuests) === 1 ? "Guest" : "Guests"}
              </span>
            </div>
          </div>
          <div className="rounded-full bg-slate-50 p-1.5 border border-slate-150">
            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Desktop Full Interactive Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex rounded-2xl bg-white border border-slate-200/80 p-2 md:p-2.5 shadow-sm flex-row items-center justify-between gap-4 relative"
        >
          <div className="flex flex-row items-center flex-1 w-full gap-0">
            {/* Where */}
            <div
              onClick={() => setActiveSegment("where")}
              className="flex items-center justify-between flex-1 w-full px-4 py-1.5 hover:bg-slate-50/80 rounded-xl transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 w-full">
                <MapPinIcon className="h-5 w-5 text-brand-500 shrink-0" />
                <div className="flex flex-col text-left w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Where</span>
                  <input
                    value={localLocation}
                    onChange={(e) => setLocalLocation(e.target.value)}
                    onFocus={() => setActiveSegment("where")}
                    placeholder="Anywhere"
                    className="w-full bg-transparent text-sm font-extrabold text-slate-800 outline-none placeholder:text-slate-400 mt-0.5"
                  />
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200/60 shrink-0" />

            {/* Check In & Check Out Dates (opens custom calendar) */}
            <div
              onClick={() => setActiveSegment("dates")}
              className="flex items-center justify-between flex-[1.6] w-full px-4 py-1.5 hover:bg-slate-50/80 rounded-xl transition cursor-pointer group"
            >
              <div className="flex flex-row items-center gap-6 w-full">
                {/* Check In */}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-brand-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check In</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-0.5 whitespace-nowrap">
                      {localCheckIn ? longDate(localCheckIn) : "Add date"}
                    </span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200/40" />

                {/* Check Out */}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-brand-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check Out</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-0.5 whitespace-nowrap">
                      {localCheckOut ? longDate(localCheckOut) : "Add date"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200/60 shrink-0" />

            {/* Guests */}
            <div
              onClick={() => setActiveSegment("guests")}
              className="flex items-center justify-between flex-1 w-full px-4 py-1.5 hover:bg-slate-50/80 rounded-xl transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 w-full">
                <UserIcon className="h-5 w-5 text-brand-500 shrink-0" />
                <div className="flex flex-col text-left w-full pr-4 relative">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 whitespace-nowrap">
                    {totalGuestCount} {totalGuestCount === 1 ? "Guest" : "Guests"}
                  </span>
                  <ChevronDownIcon className="absolute right-0 bottom-1 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center px-2 shrink-0">
            <button
              type="submit"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] cursor-pointer w-full md:w-auto"
            >
              <SearchIcon className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Custom Popovers */}
        <div className="hidden md:block">
          <AnimatePresence>
            {activeSegment && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.99 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "top" }}
                className={`absolute top-full z-45 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full ${
                  activeSegment === "dates"
                    ? "left-0 right-0 mx-auto max-w-2xl"
                    : activeSegment === "where"
                      ? "left-4 max-w-xs"
                      : "right-4 max-w-xs"
                }`}
              >
                {activeSegment === "where" && (
                  <>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Suggested destinations
                    </p>
                    {filteredSuggestions.length === 0 ? (
                      <p className="py-2 text-xs text-slate-400 font-semibold">No matches found</p>
                    ) : (
                      <ul className="space-y-1 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {filteredSuggestions.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => {
                                setLocalLocation(s);
                                setActiveSegment("dates");
                              }}
                              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50 cursor-pointer"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                                <MapPinIcon className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-bold text-slate-800">{s}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {activeSegment === "dates" && (
                  <RangeCalendar
                    checkIn={localCheckIn}
                    checkOut={localCheckOut}
                    onPick={(date) => {
                      if (!localCheckIn || (localCheckIn && localCheckOut) || date < localCheckIn) {
                        setLocalCheckIn(date);
                        setLocalCheckOut("");
                      } else {
                        setLocalCheckOut(date);
                        setActiveSegment("guests"); // Move to guests next
                      }
                    }}
                  />
                )}

                {activeSegment === "guests" && (
                  <div className="flex flex-col">
                    <GuestRow
                      label="Adults"
                      sub="Ages 13 or above"
                      value={guests.adults}
                      onChange={(v) => setGuests((g) => ({ ...g, adults: v }))}
                      min={1}
                    />
                    <GuestRow
                      label="Children"
                      sub="Ages 2–12"
                      value={guests.children}
                      onChange={(v) => setGuests((g) => ({ ...g, children: v }))}
                    />
                    <GuestRow
                      label="Infants"
                      sub="Under 2"
                      value={guests.infants}
                      onChange={(v) => setGuests((g) => ({ ...g, infants: v }))}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Quick property_type Horizon Categories */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full md:max-w-4xl">
          {[
            { label: "All Stays", value: "All" },
            { label: "Hotels", value: "Hotel" },
            { label: "Resorts", value: "Resort" },
            { label: "Villas", value: "Villa" },
            { label: "Apartments", value: "Apartment" },
            { label: "Beachfront", value: "Beachfront" },
          ].map((tab) => {
            const isActive = activeCategoryTab === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => handleCategoryTabSelect(tab.value)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition border ${
                  isActive
                    ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex md:hidden items-center gap-1 flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 transition cursor-pointer"
          >
            <span>Filters</span>
            <ChevronDownIcon className="h-3 w-3 text-slate-500" />
          </button>
        </div>

        {/* View mode toggle (Desktop only) */}
        <div className="hidden md:flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              viewMode === "list"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              viewMode === "map"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Map Split</span>
          </button>
        </div>
      </div>

      {/* 3. Action bar & chips row */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            {locationParam ? `Stays in ${locationParam}` : "Explore all stays"}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {sortedHotels.length} approved stays found
          </p>
        </div>

        {/* Sort and Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Quick chips */}
          <button
            onClick={() => handleSortChange("recommended")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              sortBy === "recommended" ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => handleSortChange("price-asc")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              sortBy === "price-asc" ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Price: Low to High
          </button>
          <button
            onClick={() => handleSortChange("price-desc")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              sortBy === "price-desc" ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Price: High to Low
          </button>
          <button
            onClick={() => handleSortChange("rating")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              sortBy === "rating" ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Rating
          </button>

          {/* Quick toggle options */}
          <button
            onClick={() => handleFilterChange({ ...filters, freeCancellation: !filters.freeCancellation })}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              filters.freeCancellation ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Free cancellation
          </button>

          <button
            onClick={() => setMobileMenuOpen("filters")}
            className="md:hidden flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN LAYOUT */}
      <div className={`grid grid-cols-1 ${
        viewMode === "map" && isMapFullScreen
          ? ""
          : "lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]"
      } gap-6 items-start`}>
        {/* Desktop Sidebar Filters */}
        <motion.div
          layout
          className={`w-full ${
            viewMode === "map" && isMapFullScreen ? "hidden" : "hidden lg:block lg:w-[280px] xl:w-[300px] shrink-0"
          } sticky top-20`}
        >
          <ExploreFilters
            allHotels={hotels}
            filteredHotels={filteredHotels}
            filters={filters}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />
        </motion.div>

        {/* Dynamic List + Map region */}
        <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[600px] items-stretch flex-1">
          {/* Stays List */}
          <motion.div
            layout
            className={`flex flex-col gap-5 transition-all duration-300 ${
              viewMode === "map"
                ? isMapFullScreen
                  ? "hidden"
                  : "xl:max-w-[55%] xl:w-[55%]"
                : "w-full"
            }`}
          >
            {sortedHotels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg font-bold text-slate-900">No stays found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search criteria.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2 text-sm transition"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-4"
              >
                {sortedHotels.map((hotel) => (
                  <motion.div
                    key={hotel.id}
                    variants={cardVariants}
                  >
                    <ExploreHotelCard
                      hotel={hotel}
                      checkIn={checkInParam}
                      checkOut={checkOutParam}
                      isSelected={hotel.id === selectedHotelId}
                      onMouseEnter={() => setSelectedHotelId(hotel.id)}
                      onMouseLeave={() => setSelectedHotelId(null)}
                      isMapOpen={viewMode === "map"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Side-by-side Map (Desktop only, toggleable) */}
          <AnimatePresence mode="wait">
            {viewMode === "map" && (
              <motion.div
                key="desktop-map"
                layout
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className={`${
                  isMapFullScreen ? "w-full" : "flex-1"
                } hidden xl:block min-h-[600px] h-[75vh] sticky top-20 rounded-2xl overflow-hidden border border-slate-100 shadow-sm`}
              >
                <ExploreMap
                  hotels={sortedHotels}
                  selectedHotelId={selectedHotelId}
                  onSelectHotel={handleSelectHotelFromMap}
                  checkIn={checkInParam}
                  checkOut={checkOutParam}
                  isMapFullScreen={isMapFullScreen}
                  setIsMapFullScreen={setIsMapFullScreen}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. Mobile Floating Action Button for Map overlay */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
        <button
          onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
          className="flex items-center gap-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3.5 shadow-2xl transition active:scale-95 text-sm"
        >
          {viewMode === "map" ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Show List</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Show Map</span>
            </>
          )}
        </button>
      </div>

      {/* 6. Mobile Map Fullscreen overlay */}
      {viewMode === "map" && (
        <div className="fixed inset-0 top-[60px] z-20 md:hidden xl:hidden">
          <ExploreMap
            hotels={sortedHotels}
            selectedHotelId={selectedHotelId}
            onSelectHotel={handleSelectHotelFromMap}
            checkIn={checkInParam}
            checkOut={checkOutParam}
          />
        </div>
      )}

      {/* 7. Mobile bottom sheet filters modal */}
      <AnimatePresence>
        {mobileMenuOpen === "filters" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center"
            onClick={() => setMobileMenuOpen("none")}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white w-full max-h-[85vh] rounded-t-3xl overflow-y-auto no-scrollbar shadow-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileMenuOpen("none")}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ExploreFilters
                allHotels={hotels}
                filteredHotels={filteredHotels}
                filters={filters}
                onChange={handleFilterChange}
                onReset={resetFilters}
              />
              <button
                onClick={() => setMobileMenuOpen("none")}
                className="mt-6 w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 text-center shadow-md cursor-pointer"
              >
                Show {filteredHotels.length} results
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Modal Overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 md:hidden"
            onClick={() => setIsMobileSearchOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white w-full max-h-[90vh] sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 border border-slate-100 flex flex-col gap-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Edit Search</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Where Segment */}
                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setActiveMobileSegment("where")}
                    className={`flex items-center gap-3 border ${
                      activeMobileSegment === "where" ? "border-brand-500 bg-brand-50/10" : "border-slate-200"
                    } rounded-xl p-3 cursor-pointer`}
                  >
                    <MapPinIcon className="h-5 w-5 text-brand-500 shrink-0" />
                    <div className="flex flex-col w-full text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Where</span>
                      <input
                        value={localLocation}
                        onChange={(e) => setLocalLocation(e.target.value)}
                        onFocus={() => setActiveMobileSegment("where")}
                        placeholder="Anywhere"
                        className="w-full bg-transparent text-sm font-extrabold text-slate-800 outline-none mt-0.5"
                      />
                    </div>
                  </div>
                  {activeMobileSegment === "where" && (
                    <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto">
                      {filteredSuggestions.length === 0 ? (
                        <p className="py-2 text-xs text-slate-400 font-semibold text-center">No matches found</p>
                      ) : (
                        filteredSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setLocalLocation(s);
                              setActiveMobileSegment("dates");
                            }}
                            className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-150/50 rounded-lg px-2 transition cursor-pointer"
                          >
                            <MapPinIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-800">{s}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Dates Segment */}
                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setActiveMobileSegment("dates")}
                    className={`flex items-center gap-3 border ${
                      activeMobileSegment === "dates" ? "border-brand-500 bg-brand-50/10" : "border-slate-200"
                    } rounded-xl p-3 cursor-pointer`}
                  >
                    <CalendarIcon className="h-5 w-5 text-brand-500 shrink-0" />
                    <div className="flex flex-col w-full text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">When</span>
                      <span className="text-sm font-extrabold text-slate-800 mt-0.5">
                        {localCheckIn && localCheckOut
                          ? `${longDate(localCheckIn)} - ${longDate(localCheckOut)}`
                          : "Add dates"}
                      </span>
                    </div>
                  </div>
                  {activeMobileSegment === "dates" && (
                    <div className="border border-slate-100 rounded-xl p-2 bg-white flex justify-center scale-90 sm:scale-95 origin-top overflow-x-auto no-scrollbar">
                      <RangeCalendar
                        checkIn={localCheckIn}
                        checkOut={localCheckOut}
                        onPick={(date) => {
                          if (!localCheckIn || (localCheckIn && localCheckOut) || date < localCheckIn) {
                            setLocalCheckIn(date);
                            setLocalCheckOut("");
                          } else {
                            setLocalCheckOut(date);
                            setActiveMobileSegment("guests");
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Guests Segment */}
                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setActiveMobileSegment("guests")}
                    className={`flex items-center gap-3 border ${
                      activeMobileSegment === "guests" ? "border-brand-500 bg-brand-50/10" : "border-slate-200"
                    } rounded-xl p-3 cursor-pointer`}
                  >
                    <UserIcon className="h-5 w-5 text-brand-500 shrink-0" />
                    <div className="flex flex-col w-full text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</span>
                      <span className="text-sm font-extrabold text-slate-800 mt-0.5">
                        {totalGuestCount} {totalGuestCount === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>
                  </div>
                  {activeMobileSegment === "guests" && (
                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
                      <GuestRow
                        label="Adults"
                        sub="Ages 13 or above"
                        value={guests.adults}
                        onChange={(v) => setGuests((g) => ({ ...g, adults: v }))}
                        min={1}
                      />
                      <GuestRow
                        label="Children"
                        sub="Ages 2–12"
                        value={guests.children}
                        onChange={(v) => setGuests((g) => ({ ...g, children: v }))}
                      />
                      <GuestRow
                        label="Infants"
                        sub="Under 2"
                        value={guests.infants}
                        onChange={(v) => setGuests((g) => ({ ...g, infants: v }))}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    handleSearchSubmit(e);
                    setIsMobileSearchOpen(false);
                  }}
                  className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 text-center shadow-md cursor-pointer mt-2"
                >
                  Search Stays
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-55 flex items-end justify-center p-0 md:hidden"
            onClick={() => setIsMobileFiltersOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white w-full max-h-[85vh] rounded-t-3xl shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-750 cursor-pointer"
                >
                  Done
                </button>
              </div>

              <ExploreFilters
                allHotels={hotels}
                filteredHotels={filteredHotels}
                filters={filters}
                onChange={handleFilterChange}
                onReset={resetFilters}
              />
              
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 text-center shadow-md cursor-pointer mt-2"
              >
                Show {filteredHotels.length} stays
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}