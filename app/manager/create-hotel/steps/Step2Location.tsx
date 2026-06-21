"use client";

import LeafletMap from "../components/LeafletMap";

import { UseHotelDraftReturn } from "../useHotelDraft";

interface Step2LocationProps {
  draftContext: UseHotelDraftReturn;
}

// Fixed landmarks in Kerala for dynamic distance calculation
const LANDMARKS = [
  { name: "Cochin International Airport", lat: 10.1586, lng: 76.4013 },
  { name: "Aluva Railway Station", lat: 10.1094, lng: 76.3533 },
  { name: "Cherai Beach", lat: 10.1416, lng: 76.1783 },
  { name: "Lulu Mall Kochi", lat: 10.0278, lng: 76.3117 },
];

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export default function Step2Location({ draftContext }: Step2LocationProps) {
  const { draft, patch } = draftContext;

  if (!draft) return null;

  const handleMapChange = (lat: number, lng: number) => {
    patch({
      latitude: lat,
      longitude: lng,
    });
  };

  const handleAddressResolved = (address: {
    country: string;
    state: string;
    city: string;
    pincode: string;
    address_line: string;
  }) => {
    const updates: Partial<typeof draft> = {};
    if (address.country) updates.country = address.country;
    if (address.state) updates.state = address.state;
    if (address.city) updates.city = address.city;
    if (address.pincode) updates.pincode = address.pincode;
    if (address.address_line) updates.address_line = address.address_line;

    patch(updates);
  };

  const currentLat = draft.latitude || 10.0278; // Fallback to Kochi coords
  const currentLng = draft.longitude || 76.3117;

  // Compute live nearby places distances
  const nearbyPlaces = LANDMARKS.map((place) => {
    const distance = getHaversineDistance(currentLat, currentLng, place.lat, place.lng);
    return {
      name: place.name,
      distance: `${distance} km`,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Address Form Card */}
      <div className="lg:col-span-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Address information
          </h3>

          <div className="space-y-4">
            {/* Country, State, City */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700">
                  Country <span className="text-brand-500">*</span>
                </label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={draft.country || "India"}
                  onChange={(e) => patch({ country: e.target.value })}
                  required
                >
                  <option value="India">India</option>
                  <option value="Sri Lanka">Sri Lanka</option>
                  <option value="Maldives">Maldives</option>
                  <option value="Nepal">Nepal</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700">
                  State / Province <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                  value={draft.state || ""}
                  onChange={(e) => patch({ state: e.target.value })}
                  placeholder="e.g. Kerala"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700">
                  City <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                  value={draft.city || ""}
                  onChange={(e) => patch({ city: e.target.value })}
                  placeholder="e.g. Aluva"
                  required
                />
              </div>
            </div>

            {/* Area / Neighborhood */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-slate-700">
                Area / Neighborhood
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                value={draft.area || ""}
                onChange={(e) => patch({ area: e.target.value })}
                placeholder="e.g. Periyar Nagar"
              />
            </div>

            {/* Full Street Address */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-slate-700">
                Address line <span className="text-brand-500">*</span>
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                value={draft.address_line || ""}
                onChange={(e) => patch({ address_line: e.target.value })}
                placeholder="e.g. Near Cochin International Airport Road"
                required
              />
            </div>

            {/* Pincode */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-slate-700">
                Pincode <span className="text-brand-500">*</span>
              </label>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                value={draft.pincode || ""}
                onChange={(e) => patch({ pincode: e.target.value })}
                placeholder="e.g. 683101"
                maxLength={6}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nearby Places Sidebar Summary */}
      <div className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-full">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">
            Location summary
          </h4>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-900">Coordinates</span>
              <span className="text-slate-600">
                Lat: {typeof draft.latitude === "number" ? draft.latitude.toFixed(6) : "Not set"}
              </span>
              <span className="text-slate-600">
                Long: {typeof draft.longitude === "number" ? draft.longitude.toFixed(6) : "Not set"}
              </span>
            </div>

            <div className="space-y-3">
              <span className="font-semibold text-slate-800 block">Nearby landmarks</span>
              <div className="space-y-2.5 border-l border-brand-300 pl-3">
                {nearbyPlaces.map((place, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5 relative">
                    <div className="absolute -left-[16.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
                    <span className="font-medium text-slate-700">
                      {place.name}
                    </span>
                    <span className="text-slate-400 font-bold">
                      {place.distance} away
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Selector Card */}
      <div className="lg:col-span-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LeafletMap
            latitude={draft.latitude ?? null}
            longitude={draft.longitude ?? null}
            onChange={handleMapChange}
            onAddressResolved={handleAddressResolved}
          />
        </div>
      </div>
    </div>
  );
}
