"use client";

import { useState } from "react";

export default function HotelsClient({ hotels }: { hotels: any[] }) {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const filteredHotels = hotels.filter((hotel) => {
    const matchesSearch =
      hotel.name.toLowerCase().includes(search.toLowerCase()) ||
      hotel.location.toLowerCase().includes(search.toLowerCase());

    const matchesRating =
      !rating || Number(hotel.rating) >= Number(rating);

      const matchesAmenity =
  selectedAmenities.length === 0 ||
  selectedAmenities.every((item) =>
    hotel.amenities?.includes(item)
  );

    return matchesSearch && matchesRating && matchesAmenity;
  });


  const sortedHotels = [...filteredHotels];

if (sortBy === "rating-high") {
  sortedHotels.sort((a, b) => b.rating - a.rating);
}

if (sortBy === "rating-low") {
  sortedHotels.sort((a, b) => a.rating - b.rating);
}

if (sortBy === "name-asc") {
  sortedHotels.sort((a, b) => a.name.localeCompare(b.name));
}

if (sortBy === "name-desc") {
  sortedHotels.sort((a, b) => b.name.localeCompare(a.name));
}

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search hotels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border rounded-lg"
        />

        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="p-3 border rounded-lg"
        >
          <option value="">All Ratings</option>
          <option value="4">4.0+</option>
          <option value="4.5">4.5+</option>
          <option value="4.8">4.8+</option>
        </select>

        <select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  className="p-3 border rounded-lg"
>
  <option value="">Sort By</option>
  <option value="rating-high">Highest Rated</option>
  <option value="rating-low">Lowest Rated</option>
  <option value="name-asc">A-Z</option>
  <option value="name-desc">Z-A</option>
</select>

        <div className="flex items-center gap-3 flex-wrap">
  {["WiFi", "Pool", "Gym", "Spa", "Parking"].map((item) => (
    <label key={item} className="flex items-center gap-1">
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
      />
      {item}
    </label>
  ))}
</div>
      </div>


        <p className="mb-4 text-gray-600 font-medium">
  {filteredHotels.length} hotel(s) found
</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedHotels.map((hotel) => (
          <div
            key={hotel.id}
            className="border rounded-lg p-4 shadow-lg bg-white"
          >
            <img
              src={hotel.image_url}
              alt={hotel.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />

            <h2 className="text-xl font-semibold">{hotel.name}</h2>

            <p className="text-gray-600">📍 {hotel.location}</p>

            <p className="mt-2">{hotel.description}</p>

            <p className="mt-2 font-semibold">
              ⭐ {hotel.rating}
            </p>

            <p className="text-sm text-gray-600">
              {hotel.amenities
                ?.replace(/[{}"]/g, "")
                .replace(/,/g, " • ")}
            </p>

            <a
              href={`/hotels/${hotel.id}`}
              className="inline-block mt-4 px-4 py-2 bg-pink-600 text-white rounded"
            >
              View Details
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}