"use client";

import { useState } from "react";

import { UseHotelDraftReturn } from "../useHotelDraft";

interface Step5AmenitiesProps {
  draftContext: UseHotelDraftReturn;
}

const AMENITY_CATEGORIES = [
  {
    id: "general",
    label: "General",
    options: [
      "Free Wi-Fi",
      "Parking",
      "Air conditioning",
      "24/7 front desk",
      "Room service",
      "Laundry service",
      "Daily housekeeping",
      "Elevator",
      "Luggage storage",
      "Wake-up call",
      "Doctor on call",
      "Power backup",
      "Newspaper",
      "Smoking rooms",
      "Designated smoking area",
    ],
  },
  {
    id: "recreation",
    label: "Recreation",
    options: [
      "Swimming pool",
      "Fitness center / Gym",
      "Spa & massage",
      "Indoor games",
      "Outdoor sports",
      "Garden",
      "Terrace",
      "Beachfront",
      "Cycling",
    ],
  },
  {
    id: "dining",
    label: "Dining",
    options: [
      "Restaurant",
      "Bar / Lounge",
      "Coffee shop",
      "Breakfast buffet",
      "Kitchen / Kitchenette",
      "BBQ facilities",
    ],
  },
  {
    id: "family",
    label: "Family",
    options: [
      "Kids play area",
      "Babysitting services",
      "Kids pool",
      "Family rooms",
    ],
  },
  {
    id: "business",
    label: "Business",
    options: [
      "Conference room",
      "Business center",
      "Fax / Photocopy",
      "Banquet hall",
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    options: [
      "Wheelchair accessible",
      "Accessible bathroom",
      "Elevator with braille",
      "Auditory guidance",
    ],
  },
  {
    id: "safety",
    label: "Safety & Security",
    options: [
      "CCTV security",
      "24/7 Security guard",
      "Fire extinguishers",
      "Smoke detectors",
      "In-room Safe box",
      "First-aid kit",
    ],
  },
];

export default function Step5Amenities({ draftContext }: Step5AmenitiesProps) {
  const { draft, patch } = draftContext;

  const [activeCategory, setActiveCategory] = useState("general");
  const [viewSelectedOnly, setViewSelectedOnly] = useState(false);

  if (!draft) return null;

  const selectedAmenities = draft.amenities || [];

  const handleToggleAmenity = (amenity: string) => {
    let next: string[];
    if (selectedAmenities.includes(amenity)) {
      next = selectedAmenities.filter((x: string) => x !== amenity);
    } else {
      next = [...selectedAmenities, amenity];
    }
    patch({ amenities: next });
  };

  const getCountForCategory = (catOptions: string[]) => {
    return catOptions.filter((opt) => selectedAmenities.includes(opt)).length;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Toggle Filter & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
          <span className="text-sm font-bold text-slate-800">
            Selected {selectedAmenities.length} amenities
          </span>
          <button
            type="button"
            onClick={() => setViewSelectedOnly((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              viewSelectedOnly
                ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {viewSelectedOnly ? "View all amenities" : "View selected only"}
          </button>
        </div>

        {viewSelectedOnly ? (
          /* Selected Only Filtered View */
          selectedAmenities.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-10">
              No amenities selected yet. Switch back to select facilities.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedAmenities.map((amenity: string) => (
                <div
                  key={amenity}
                  onClick={() => handleToggleAmenity(amenity)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs font-semibold cursor-pointer hover:bg-emerald-100/70 transition"
                >
                  <span className="text-emerald-700 font-bold shrink-0">✓</span>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Tabbed Category Checkbox Grid View */
          <div className="space-y-6">
            {/* Category horizontal scrolling tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto pb-1.5 scrollbar-thin">
              {AMENITY_CATEGORIES.map((cat) => {
                const count = getCountForCategory(cat.options);
                const isActive = cat.id === activeCategory;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`pb-2.5 text-xs font-bold border-b-2 px-3 whitespace-nowrap transition flex items-center gap-1.5 ${
                      isActive
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Checkbox Grid for Active Category */}
            <div>
              {AMENITY_CATEGORIES.map((cat) => {
                if (cat.id !== activeCategory) return null;

                return (
                  <div key={cat.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fadeIn">
                    {cat.options.map((opt) => {
                      const isChecked = selectedAmenities.includes(opt);

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleAmenity(opt)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs transition leading-normal w-full ${
                            isChecked
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                          }`}
                        >
                          <div
                            className={`h-4.5 w-4.5 rounded flex items-center justify-center shrink-0 border border-slate-300 transition ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-white"
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className="h-2.5 w-2.5 fill-none stroke-current stroke-[3.5px]"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
