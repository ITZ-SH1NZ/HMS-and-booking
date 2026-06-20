"use client";

import { useState } from "react";

export default function HotelSearch() {
  const [search, setSearch] = useState("");

  return (
    <div className="mb-6 flex gap-4">
      <input
        type="text"
        placeholder="Search hotels..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 p-3 border rounded-lg"
      />

      <select className="p-3 border rounded-lg">
        <option>All Ratings</option>
        <option>4.0+</option>
        <option>4.5+</option>
        <option>4.8+</option>
      </select>

      <select className="p-3 border rounded-lg">
        <option>All Amenities</option>
        <option>WiFi</option>
        <option>Pool</option>
        <option>Gym</option>
        <option>Spa</option>
        <option>Parking</option>
      </select>
    </div>
  );
}