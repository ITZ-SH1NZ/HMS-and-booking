"use client";

import { useMemo } from "react";
import { StarIcon, LockIcon } from "@/components/icons";
import { parseAmenities } from "@/lib/hotels";

export interface FilterState {
  priceRange: [number, number];
  propertyTypes: string[];
  minRating: number | null;
  amenities: string[];
  freeCancellation: boolean;
}

interface ExploreFiltersProps {
  allHotels: any[];
  filteredHotels: any[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

const PROPERTY_TYPES = [
  "Hotel",
  "Resort",
  "Villa",
  "Apartment",
  "Homestay",
  "Guest house",
  "Hostel",
];

const AMENITY_MAPPINGS = [
  { label: "Swimming Pool", keys: ["pool", "swimming pool", "swimming_pool"] },
  { label: "Free Wi-Fi", keys: ["wifi", "free wi-fi", "free_wifi", "wi-fi"] },
  { label: "Breakfast included", keys: ["breakfast", "breakfast included", "breakfast_buffet", "free breakfast", "free_breakfast"] },
  { label: "Sea View", keys: ["sea view", "beachfront", "beach view"] },
  { label: "Spa", keys: ["spa", "spa & massage", "spa_massage"] },
  { label: "Gym", keys: ["gym", "fitness center / gym", "fitness_center"] },
  { label: "Parking", keys: ["parking", "free parking"] },
];

export default function ExploreFilters({
  allHotels,
  filteredHotels,
  filters,
  onChange,
  onReset,
}: ExploreFiltersProps) {
  // 1. Calculate price range limit and histogram
  const maxPriceLimit = 20000;

  const histogram = useMemo(() => {
    const buckets = Array(10).fill(0);
    const bucketSize = maxPriceLimit / 10;

    allHotels.forEach((hotel) => {
      const prices = hotel.rooms?.map((r: any) => Number(r.price)) ?? [];
      const minPrice = prices.length ? Math.min(...prices) : 0;
      if (minPrice > 0) {
        const bucketIndex = Math.min(
          Math.floor(minPrice / bucketSize),
          9
        );
        buckets[bucketIndex]++;
      }
    });

    const maxCount = Math.max(...buckets, 1);
    return buckets.map((count) => (count / maxCount) * 100);
  }, [allHotels]);

  // Helper to check if a hotel matches filters EXCLUDING a specific filter key
  // This gives the correct count of items that *would* match if they toggled this filter
  const getPropertyTypeCount = (type: string) => {
    return allHotels.filter((hotel) => {
      // Apply all filters EXCEPT propertyType
      const minPriceMatch = (() => {
        const prices = hotel.rooms?.map((r: any) => Number(r.price)) ?? [];
        const minPrice = prices.length ? Math.min(...prices) : 0;
        return minPrice >= filters.priceRange[0] && minPrice <= filters.priceRange[1];
      })();

      const ratingMatch = !filters.minRating || (hotel.reviews?.length ? 
        (hotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / hotel.reviews.length) >= filters.minRating
        : (hotel.rating ?? 0) >= filters.minRating);

      const cancelMatch = !filters.freeCancellation || hotel.cancellation_policy === "flexible";

      const amenitiesMatch = filters.amenities.every((amenityLabel) => {
        const mapped = AMENITY_MAPPINGS.find(m => m.label === amenityLabel);
        if (!mapped) return false;
        const hotelAmens = parseAmenities(hotel.amenities).map(a => a.toLowerCase());
        return mapped.keys.some(k => hotelAmens.some(ha => ha.includes(k)));
      });

      const matchesType = hotel.property_type?.toLowerCase() === type.toLowerCase();

      return minPriceMatch && ratingMatch && cancelMatch && amenitiesMatch && matchesType;
    }).length;
  };

  const getAmenityCount = (amenityLabel: string) => {
    return allHotels.filter((hotel) => {
      // Apply all filters EXCEPT this specific amenity
      const minPriceMatch = (() => {
        const prices = hotel.rooms?.map((r: any) => Number(r.price)) ?? [];
        const minPrice = prices.length ? Math.min(...prices) : 0;
        return minPrice >= filters.priceRange[0] && minPrice <= filters.priceRange[1];
      })();

      const typeMatch = filters.propertyTypes.length === 0 || 
        filters.propertyTypes.some(t => hotel.property_type?.toLowerCase() === t.toLowerCase());

      const ratingMatch = !filters.minRating || (hotel.reviews?.length ? 
        (hotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / hotel.reviews.length) >= filters.minRating
        : (hotel.rating ?? 0) >= filters.minRating);

      const cancelMatch = !filters.freeCancellation || hotel.cancellation_policy === "flexible";

      const otherAmenitiesMatch = filters.amenities
        .filter(a => a !== amenityLabel)
        .every((al) => {
          const mapped = AMENITY_MAPPINGS.find(m => m.label === al);
          if (!mapped) return false;
          const hotelAmens = parseAmenities(hotel.amenities).map(a => a.toLowerCase());
          return mapped.keys.some(k => hotelAmens.some(ha => ha.includes(k)));
        });

      const hotelAmens = parseAmenities(hotel.amenities).map(a => a.toLowerCase());
      const mapped = AMENITY_MAPPINGS.find(m => m.label === amenityLabel);
      const matchesAmenity = mapped ? mapped.keys.some(k => hotelAmens.some(ha => ha.includes(k))) : false;

      return minPriceMatch && typeMatch && ratingMatch && cancelMatch && otherAmenitiesMatch && matchesAmenity;
    }).length;
  };

  const getCancellationCount = () => {
    return allHotels.filter((hotel) => {
      const minPriceMatch = (() => {
        const prices = hotel.rooms?.map((r: any) => Number(r.price)) ?? [];
        const minPrice = prices.length ? Math.min(...prices) : 0;
        return minPrice >= filters.priceRange[0] && minPrice <= filters.priceRange[1];
      })();

      const typeMatch = filters.propertyTypes.length === 0 || 
        filters.propertyTypes.some(t => hotel.property_type?.toLowerCase() === t.toLowerCase());

      const ratingMatch = !filters.minRating || (hotel.reviews?.length ? 
        (hotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / hotel.reviews.length) >= filters.minRating
        : (hotel.rating ?? 0) >= filters.minRating);

      const amenitiesMatch = filters.amenities.every((amenityLabel) => {
        const mapped = AMENITY_MAPPINGS.find(m => m.label === amenityLabel);
        if (!mapped) return false;
        const hotelAmens = parseAmenities(hotel.amenities).map(a => a.toLowerCase());
        return mapped.keys.some(k => hotelAmens.some(ha => ha.includes(k)));
      });

      return minPriceMatch && typeMatch && ratingMatch && amenitiesMatch && hotel.cancellation_policy === "flexible";
    }).length;
  };

  const handlePriceChange = (min: number, max: number) => {
    onChange({ ...filters, priceRange: [min, max] });
  };

  const handlePropertyTypeToggle = (type: string) => {
    const updated = filters.propertyTypes.includes(type)
      ? filters.propertyTypes.filter((t) => t !== type)
      : [...filters.propertyTypes, type];
    onChange({ ...filters, propertyTypes: updated });
  };

  const handleRatingSelect = (rating: number | null) => {
    onChange({ ...filters, minRating: rating });
  };

  const handleAmenityToggle = (amenity: string) => {
    const updated = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onChange({ ...filters, amenities: updated });
  };

  const handleCancellationToggle = () => {
    onChange({ ...filters, freeCancellation: !filters.freeCancellation });
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold text-slate-900">Filters</h2>
        <button
          onClick={onReset}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Reset all
        </button>
      </div>

      {/* Price per night */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900">Price per night</h3>
        <p className="text-xs text-slate-500">
          ₹{filters.priceRange[0].toLocaleString("en-IN")} - ₹
          {filters.priceRange[1] >= maxPriceLimit
            ? `${maxPriceLimit.toLocaleString("en-IN")}+`
            : filters.priceRange[1].toLocaleString("en-IN")}
        </p>

        {/* Histogram */}
        <div className="flex h-12 w-full items-end gap-1 px-2">
          {histogram.map((height, i) => {
            const bucketSize = maxPriceLimit / 10;
            const startPrice = i * bucketSize;
            const inRange =
              startPrice >= filters.priceRange[0] &&
              startPrice <= filters.priceRange[1];
            return (
              <div
                key={i}
                className={`flex-1 rounded-t-sm transition-all duration-300 ${
                  inRange ? "bg-brand-500" : "bg-slate-200"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Range Slider */}
        <div className="relative mt-2 flex h-6 items-center px-1">
          <input
            type="range"
            min={0}
            max={maxPriceLimit}
            step={500}
            value={filters.priceRange[0]}
            onChange={(e) => {
              const val = Math.min(Number(e.target.value), filters.priceRange[1] - 500);
              handlePriceChange(val, filters.priceRange[1]);
            }}
            className="pointer-events-none absolute inset-0 z-20 w-full appearance-none bg-transparent accent-brand-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow"
          />
          <input
            type="range"
            min={0}
            max={maxPriceLimit}
            step={500}
            value={filters.priceRange[1]}
            onChange={(e) => {
              const val = Math.max(Number(e.target.value), filters.priceRange[0] + 500);
              handlePriceChange(filters.priceRange[0], val);
            }}
            className="pointer-events-none absolute inset-0 z-20 w-full appearance-none bg-transparent accent-brand-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow"
          />
          <div className="h-1.5 w-full rounded bg-slate-100" />
        </div>
      </div>

      {/* Property type */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900">Property type</h3>
        <div className="flex flex-col gap-2">
          {PROPERTY_TYPES.map((type) => {
            const count = getPropertyTypeCount(type);
            const isChecked = filters.propertyTypes.includes(type);
            return (
              <label
                key={type}
                className="flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handlePropertyTypeToggle(type)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 accent-brand-600"
                  />
                  <span>{type}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Guest rating */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900">Guest rating</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Any", value: null },
            { label: "4.0+", value: 4 },
            { label: "4.5+", value: 4.5 },
            { label: "4.8+", value: 4.8 },
          ].map((item) => {
            const isActive = filters.minRating === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleRatingSelect(item.value)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                  isActive
                    ? "bg-brand-50 border-brand-500 text-brand-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {item.value && <StarIcon className="h-3 w-3 text-gold-500" filled />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amenities */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900">Amenities</h3>
        <div className="flex flex-col gap-2">
          {AMENITY_MAPPINGS.map((mapping) => {
            const count = getAmenityCount(mapping.label);
            const isChecked = filters.amenities.includes(mapping.label);
            return (
              <label
                key={mapping.label}
                className="flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleAmenityToggle(mapping.label)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 accent-brand-600"
                  />
                  <span>{mapping.label}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Cancellation policy */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900">Cancellation policy</h3>
        <label className="flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.freeCancellation}
              onChange={handleCancellationToggle}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 accent-brand-600"
            />
            <span>Free cancellation</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">{getCancellationCount()}</span>
        </label>
      </div>

      {/* Instant book - Omitted/Disabled Stub */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
          <LockIcon className="h-4 w-4 text-slate-300" />
          <span>Instant book</span>
        </div>
        <div className="flex items-center gap-2 pl-5 text-xs text-slate-400">
          <div className="h-3.5 w-7 rounded-full bg-slate-100 p-0.5 opacity-60">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>
          <span>Not supported yet</span>
        </div>
      </div>
    </div>
  );
}
