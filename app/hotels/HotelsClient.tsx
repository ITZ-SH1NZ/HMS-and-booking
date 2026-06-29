"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { parseAmenities } from "@/lib/hotels";
import ExploreFilters, { FilterState } from "./ExploreFilters";
import ExploreHotelCard from "./ExploreHotelCard";
import {
  StarIcon,
  MapPinIcon,
  SearchIcon,
  CalendarIcon,
  UserIcon,
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

export default function HotelsClient({ hotels }: { hotels: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters from homepage
  const locationParam = searchParams.get("location") ?? "";
  const checkInParam = searchParams.get("checkIn") ?? "";
  const checkOutParam = searchParams.get("checkOut") ?? "";
  const guestsParam = searchParams.get("guests") ?? "1";

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
      {/* 1. Header Summary Summary Banner */}
      <div className="mb-6 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 md:gap-6 w-full md:w-auto">
          {/* Where */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer">
            <MapPinIcon className="h-5 w-5 text-brand-500" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Where</span>
              <span className="text-sm font-bold text-slate-900">{locationParam || "Anywhere"}</span>
            </div>
          </div>
          {/* Check-In / Check-Out */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer border-l border-slate-100 pl-4 md:pl-6">
            <CalendarIcon className="h-5 w-5 text-brand-500" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Dates</span>
              <span className="text-sm font-bold text-slate-900">{formattedDates}</span>
            </div>
          </div>
          {/* Guests */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer border-l border-slate-100 pl-4 md:pl-6">
            <UserIcon className="h-5 w-5 text-brand-500" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Guests</span>
              <span className="text-sm font-bold text-slate-900">{guestsParam} Guests</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] w-full md:w-auto"
        >
          <SearchIcon className="h-4 w-4" />
          <span>Change search</span>
        </button>
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
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
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
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block sticky top-20 self-start max-h-[85vh] overflow-y-auto no-scrollbar">
          <ExploreFilters
            allHotels={hotels}
            filteredHotels={filteredHotels}
            filters={filters}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />
        </aside>

        {/* Dynamic List + Map region */}
        <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[600px] items-stretch">
          {/* Stays List */}
          <div
            className={`flex flex-col gap-5 flex-1 transition-all duration-300 ${
              viewMode === "map" && sortedHotels.length > 0 ? "xl:max-w-[55%] xl:w-[55%]" : "w-full"
            }`}
          >
            {sortedHotels.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 px-4 text-center shadow-sm">
                <div className="rounded-full bg-slate-50 p-4 mb-4">
                  <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">No stays found</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Try adjusting your filters, searching a different location, or resetting the criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 rounded-xl bg-brand-500 hover:bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sortedHotels.map((hotel) => (
                  <ExploreHotelCard
                    key={hotel.id}
                    hotel={hotel}
                    checkIn={checkInParam}
                    checkOut={checkOutParam}
                    isSelected={hotel.id === selectedHotelId}
                    onMouseEnter={() => setSelectedHotelId(hotel.id)}
                    onMouseLeave={() => setSelectedHotelId(null)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Side-by-side Map (Desktop only, toggleable) */}
          {viewMode === "map" && (
            <div className="hidden xl:block flex-1 min-h-[600px] h-[75vh] sticky top-20 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <ExploreMap
                hotels={sortedHotels}
                selectedHotelId={selectedHotelId}
                onSelectHotel={setSelectedHotelId}
                checkIn={checkInParam}
                checkOut={checkOutParam}
              />
            </div>
          )}
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
            onSelectHotel={setSelectedHotelId}
            checkIn={checkInParam}
            checkOut={checkOutParam}
          />
        </div>
      )}

      {/* 7. Mobile bottom sheet filters modal */}
      {mobileMenuOpen === "filters" && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-h-[85vh] rounded-t-3xl overflow-y-auto no-scrollbar shadow-2xl p-6 relative">
            <button
              onClick={() => setMobileMenuOpen("none")}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className="mt-6 w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 text-center shadow-md"
            >
              Show {filteredHotels.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}