"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Hotel } from "@/lib/types";
import { parsePostgresArray } from "@/lib/hotelDraft";
import { StarIcon, MapPinIcon } from "@/components/icons";

interface HotelsClientHotel extends Hotel {
  rating?: number | string | null;
}

export default function HotelsClient({ hotels }: { hotels: HotelsClientHotel[] }) {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const filteredHotels = hotels.filter((hotel) => {
    const searchTerms = search.replace(/[,()]/g, " ").toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.every(
        (term) =>
          hotel.name.toLowerCase().includes(term) ||
          hotel.location.toLowerCase().includes(term)
      );

    const matchesRating =
      !rating || Number(hotel.rating ?? 0) >= Number(rating);

    const parsedAmenities = parsePostgresArray(hotel.amenities);
    const matchesAmenity =
      selectedAmenities.length === 0 ||
      selectedAmenities.every((item) =>
        parsedAmenities.includes(item)
      );

    return matchesSearch && matchesRating && matchesAmenity;
  });

  const sortedHotels = [...filteredHotels];

  if (sortBy === "rating-high") {
    sortedHotels.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
  }

  if (sortBy === "rating-low") {
    sortedHotels.sort((a, b) => Number(a.rating ?? 0) - Number(b.rating ?? 0));
  }

  if (sortBy === "name-asc") {
    sortedHotels.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sortBy === "name-desc") {
    sortedHotels.sort((a, b) => b.name.localeCompare(a.name));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm mb-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search hotels by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 placeholder-slate-400"
          />

          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-755"
          >
            <option value="">All Ratings</option>
            <option value="4">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.8">4.8+ Stars</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700"
          >
            <option value="">Sort By</option>
            <option value="rating-high">Highest Rated</option>
            <option value="rating-low">Lowest Rated</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Filter by Amenities</span>
          <div className="flex items-center gap-4 flex-wrap">
            {["WiFi", "Pool", "Gym", "Spa", "Parking"].map((item) => (
              <label key={item} className="flex items-center gap-2 cursor-pointer group text-slate-600 hover:text-brand-700 text-sm select-none">
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(item)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAmenities([...selectedAmenities, item]);
                    } else {
                      setSelectedAmenities(
                        selectedAmenities.filter((a) => a !== item)
                      );
                    }
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 w-4 h-4"
                />
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-slate-500 font-medium text-sm">
          Showing <span className="text-slate-800 font-semibold">{filteredHotels.length}</span> {filteredHotels.length === 1 ? "hotel" : "hotels"}
        </p>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {sortedHotels.map((hotel) => {
          const parsedAmenities = parsePostgresArray(hotel.amenities);
          return (
            <motion.div
              key={hotel.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -4 }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-xs hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={hotel.image_url || "/placeholder-hotel.jpg"}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {hotel.rating && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1 shadow-xs border border-slate-100">
                    <StarIcon className="h-3.5 w-3.5 text-gold-500" filled />
                    <span>{Number(hotel.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 p-6">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-brand-700 transition-colors duration-200">
                    {hotel.name}
                  </h2>

                  <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                    <MapPinIcon className="h-4 w-4 text-brand-500 shrink-0" /> {hotel.location}
                  </p>

                  <p className="mt-3 text-slate-600 text-sm line-clamp-2 leading-relaxed">
                    {hotel.description}
                  </p>
                </div>

                {parsedAmenities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1.5">
                      {parsedAmenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200/70 text-slate-600 rounded text-xs transition-colors duration-150"
                        >
                          {amenity}
                        </span>
                      ))}
                      {parsedAmenities.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-xs font-medium">
                          +{parsedAmenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {hotel.star_rating && (
                      <div className="flex items-center gap-0.5 text-xs">
                        {Array.from({ length: hotel.star_rating }).map((_, i) => (
                          <StarIcon key={i} className="h-3.5 w-3.5 text-gold-500" filled />
                        ))}
                      </div>
                    )}
                  </div>
                  <a
                    href={`/hotels/${hotel.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    View Details
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}