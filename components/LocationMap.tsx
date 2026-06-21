"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  hotelName?: string;
}

export default function LocationMap({
  latitude,
  longitude,
  hotelName = "Hotel Location",
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Defer rendering until client-side mounting
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    // Inject Leaflet CSS stylesheet dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let mapInstance: LeafletMap | null = null;

    const initMap = async () => {
      try {
        const Leaflet = await import("leaflet");

        // Initialize Map
        mapInstance = Leaflet.map(mapContainerRef.current!, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: false, // Custom zoom controls
          scrollWheelZoom: false,
          attributionControl: false, // Clean minimalist look
        });

        mapRef.current = mapInstance;

        // Add CartoDB Positron tile layer (Airbnb-style light minimalist map)
        Leaflet.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 20,
          }
        ).addTo(mapInstance);

        // Custom Airbnb-style Pin: Black circle with white house SVG
        const customIcon = Leaflet.divIcon({
          html: `
            <div class="flex items-center justify-center h-10 w-10 rounded-full bg-slate-900 border-2 border-white shadow-xl text-white transform hover:scale-105 transition-transform duration-200 cursor-pointer">
              <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
          `,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20], // Centered anchor
        });

        // Add Marker
        Leaflet.marker([latitude, longitude], { icon: customIcon })
          .addTo(mapInstance)
          .bindPopup(`
            <div class="font-bold text-slate-800 text-xs p-1">
              ${hotelName}
            </div>
          `);
      } catch (err) {
        console.error("Leaflet load error", err);
      }
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mounted, latitude, longitude, hotelName]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[220px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      {!mounted ? (
        // Loading / SSR Skeleton
        <div className="h-full w-full bg-slate-50 flex items-center justify-center animate-pulse">
          <div className="text-center text-slate-400 space-y-2">
            <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs font-semibold text-slate-400">Loading map...</span>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} className="h-full w-full z-0" />

          {/* Premium custom zoom buttons (Airbnb style) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
            <button
              type="button"
              onClick={handleZoomIn}
              className="grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition shadow-md font-bold text-lg select-none cursor-pointer"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition shadow-md font-bold text-lg select-none cursor-pointer"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
        </>
      )}
    </div>
  );
}
