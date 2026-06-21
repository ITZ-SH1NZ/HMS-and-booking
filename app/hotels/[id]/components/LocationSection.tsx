import type { Hotel, NearbyPlace } from "@/lib/types";
import { Section } from "./SectionWrapper";
import LocationMap from "@/components/LocationMap";
import { MapPinIcon } from "@/components/icons";
import { Plane, Train, Waves, Landmark, ShoppingBag, HeartPulse } from "lucide-react";

interface LocationSectionProps {
  hotel: Hotel & { nearby_places: NearbyPlace[] | null };
}

// Icon mapper for different landmark types
function getLandmarkIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("airport")) return <Plane className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
  if (t.includes("railway") || t.includes("station") || t.includes("metro"))
    return <Train className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
  if (t.includes("beach") || t.includes("sea") || t.includes("lake") || t.includes("river"))
    return <Waves className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
  if (t.includes("mall") || t.includes("market") || t.includes("shop"))
    return <ShoppingBag className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
  if (t.includes("hospital") || t.includes("clinic") || t.includes("medical"))
    return <HeartPulse className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
  return <Landmark className="h-4.5 w-4.5 text-brand-500 shrink-0" />;
}

export function LocationSection({ hotel }: LocationSectionProps) {
  const { latitude, longitude, name, address_line, city, state, country, pincode, nearby_places } = hotel;

  // Build the full formatted address string
  const fullAddress = [address_line, city, state, country, pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <Section id="location" title="Location">
      <div className="space-y-6">
        {/* Address text */}
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <MapPinIcon className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Property Address</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{fullAddress || hotel.location}</p>
          </div>
        </div>

        {/* Main Map (Full width & immersive h-[450px]) */}
        <div className="h-[450px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          {latitude && longitude ? (
            <LocationMap latitude={latitude} longitude={longitude} hotelName={name} />
          ) : (
            <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
              <MapPinIcon className="h-12 w-12 text-slate-300 mb-2" />
              <span className="text-sm">Map coordinates are unavailable.</span>
            </div>
          )}
        </div>

        {/* Landmarks / Nearby places (Below Map, grid layout) */}
        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Nearby Landmarks & Places
          </h3>
          
          {nearby_places && nearby_places.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nearby_places.map((place, idx) => (
                <div
                  key={`${place.name}-${idx}`}
                  className="flex items-center justify-between gap-3 border border-slate-200 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getLandmarkIcon(place.type)}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{place.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
                        {place.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                    {place.distance_km.toFixed(1)} km
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Landmark className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Nearby places will appear after re-publishing.</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
