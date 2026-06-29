"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Navigation, Compass, Star } from "lucide-react";
import { getDestinationStyle } from "@/components/DestinationsSection";

// We can reuse the styling categories from DestinationsSection to keep icons consistent
interface Destination {
  name: string;
  stays: string;
  count: number;
  latitude: number | null;
  longitude: number | null;
}

interface DestinationsMapSectionProps {
  destinations: Destination[];
}

export function DestinationsMapSection({ destinations }: DestinationsMapSectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // 1. Filter destinations based on search query
  const filteredDestinations = destinations.filter((dest) =>
    dest.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Initialize Leaflet Map (Voyager Theme)
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Check if already initialized to prevent double-init throwing errors
    if ((mapRef.current as any)._leaflet_id) return;

    // Find the first destination with valid coordinates to center the map
    const defaultCenter: [number, number] = [10.8505, 76.2711]; // Center of Kerala
    const firstValid = destinations.find(d => d.latitude !== null && d.longitude !== null);
    const center: [number, number] = firstValid && firstValid.latitude && firstValid.longitude 
      ? [firstValid.latitude, firstValid.longitude] 
      : defaultCenter;

    const leafletMap = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 7);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(leafletMap);

    // Add custom zoom controls at bottom-right
    L.control.zoom({
      position: "bottomright"
    }).addTo(leafletMap);

    setMap(leafletMap);

    return () => {
      leafletMap.remove();
    };
  }, []);

  // 3. Handle Resize Observer to prevent Leaflet rendering issues
  useEffect(() => {
    if (!map || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  // 4. Update Markers and Fit Bounds when filteredDestinations change
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    const bounds: L.LatLngExpression[] = [];

    filteredDestinations.forEach((dest) => {
      if (dest.latitude === null || dest.longitude === null) return;
      
      const pos: [number, number] = [dest.latitude, dest.longitude];
      bounds.push(pos);

      // Custom HTML Icon for the marker (morphs from small circle to full pill on hover)
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center group cursor-pointer" style="width: 100%; height: 100%;">
            <!-- Default State: Small, elegant circle with stay count -->
            <div class="w-6 h-6 rounded-full bg-brand-900 border border-gold-500/40 shadow-md flex items-center justify-center text-gold-400 text-[10px] font-black transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 select-none">
              ${dest.count}
            </div>
            
            <!-- Hover State: Elegant expanded pill with city name + count -->
            <div class="absolute opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto px-2.5 py-1 bg-brand-900 border border-gold-500 rounded-full text-white text-[10px] font-black whitespace-nowrap transition-all duration-300 shadow-lg z-30 flex items-center gap-1 select-none">
              <span>${dest.name}</span>
              <span class="px-1.5 py-0.5 rounded bg-white/10 text-gold-400 text-[8px] font-extrabold">${dest.count}</span>
            </div>
          </div>
        `,
        className: "custom-map-marker-interactive",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(pos, { icon: customIcon }).addTo(map);
      
      // Bind click interaction
      marker.on("click", () => {
        setSelectedCity(dest.name);
        map.setView(pos, 11, { animate: true });
        
        // Scroll the list card into view
        const element = document.getElementById(`city-card-${dest.name}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      markersRef.current[dest.name] = marker;
    });

    // Auto-center map to fit all visible markers
    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 11 });
    }
  }, [map, searchQuery]);

  // 5. Pan map to city when clicked from the list
  const handleCityClick = (dest: Destination) => {
    setSelectedCity(dest.name);
    if (map && dest.latitude !== null && dest.longitude !== null) {
      map.setView([dest.latitude, dest.longitude], 11, { animate: true });
    }
  };

  return (
    <section className="relative z-10 mx-auto max-w-[1600px] w-full px-6 md:px-10 py-12 border-t border-slate-200/60">
      {/* CSS Reset for Leaflet default divIcon style */}
      <style>{`
        .custom-map-marker-interactive {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">Popular destinations</h2>
        <p className="mt-1 text-sm text-slate-500 font-bold">
          Explore stays on our interactive map across India and beyond.
        </p>
      </div>

      {/* Main Split Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-6 bg-white border border-slate-200/60 rounded-3xl p-4 md:p-6 shadow-xs min-h-[500px]">
        
        {/* Left Side: Leaflet Map Container */}
        <div className="flex-1 relative h-[320px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-10">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Right Side: List and Search Panel */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
          
          {/* Search Input */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs focus-within:border-brand-500 transition">
            <Search className="h-4.5 w-4.5 text-slate-400 shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-slate-800 outline-none w-full placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-black text-slate-400 hover:text-slate-600 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Scrollable list of cities */}
          <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[420px] pr-1 flex flex-col gap-3 no-scrollbar">
            {filteredDestinations.length > 0 ? (
              filteredDestinations.map((dest) => {
                const isSelected = selectedCity === dest.name;
                
                return (
                  <div
                    key={dest.name}
                    id={`city-card-${dest.name}`}
                    onClick={() => handleCityClick(dest)}
                    className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-brand-900 border-brand-900 text-white shadow-md -translate-y-0.5"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? "bg-white/10 text-gold-400" : "bg-brand-50 text-brand-700"
                      }`}>
                        <Compass className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className={`font-black text-base ${isSelected ? "text-white font-serif" : "text-slate-900 font-serif"}`}>
                          {dest.name}
                        </h4>
                        <p className={`text-xs font-bold mt-0.5 ${isSelected ? "text-brand-200" : "text-slate-500"}`}>
                          {dest.stays}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/hotels?location=${dest.name}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                        isSelected
                          ? "bg-gold-500 hover:bg-gold-400 text-brand-950 shadow-sm"
                          : "bg-white border border-slate-200 hover:border-brand-500 hover:text-brand-700 text-slate-700 shadow-xs"
                      }`}
                    >
                      Explore
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="font-bold text-slate-800 text-sm">No destinations found</p>
                <p className="text-xs text-slate-500 mt-0.5">Try searching for a different city or region.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
