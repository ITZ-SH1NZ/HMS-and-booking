"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import Image from "next/image";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { StarIcon, MapPinIcon } from "@/components/icons";
import { motion, AnimatePresence } from "motion/react";

interface ExploreMapProps {
  hotels: any[];
  selectedHotelId: string | null;
  onSelectHotel: (id: string | null) => void;
  checkIn?: string;
  checkOut?: string;
  isMapFullScreen?: boolean;
  setIsMapFullScreen?: (val: boolean) => void;
}

export default function ExploreMap({
  hotels,
  selectedHotelId,
  onSelectHotel,
  checkIn,
  checkOut,
  isMapFullScreen = false,
  setIsMapFullScreen,
}: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const prevSelectedHotelIdRef = useRef<string | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Get selected hotel details for bottom overlay
  const selectedHotel = hotels.find((h) => h.id === selectedHotelId);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Center on Kochi (default) or the first hotel with coordinates
    const hotelWithCoords = hotels.find(
      (h) =>
        h.latitude != null &&
        h.longitude != null &&
        !isNaN(Number(h.latitude)) &&
        !isNaN(Number(h.longitude))
    );
    const centerLat = hotelWithCoords ? Number(hotelWithCoords.latitude) : 9.9816;
    const centerLng = hotelWithCoords ? Number(hotelWithCoords.longitude) : 76.2999;

    const leafletMap = L.map(mapRef.current, {
      zoomControl: false, // Use custom zoom controls
      attributionControl: false,
    }).setView([centerLat, centerLng], 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(leafletMap);

    leafletMap.on("movestart", () => {
      setShowSearchArea(true);
    });

    setMap(leafletMap);

    return () => {
      leafletMap.remove();
    };
  }, []);

  // Handle Map Sizing / ResizeObserver to prevent gray map tiles on toggle
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

  // Render and update markers (only when map or hotels list changes)
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    hotels.forEach((hotel) => {
      if (hotel.latitude == null || hotel.longitude == null) return;

      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isSelected = hotel.id === selectedHotelId;

      const prices = hotel.rooms?.map((r: any) => Number(r.price)).filter((p: number) => p > 0) ?? [];
      const minPrice = prices.length ? Math.min(...prices) : null;
      const priceText = minPrice ? `₹${Math.round(minPrice).toLocaleString("en-IN")}` : "₹--";

      // Initial style (we will update selected styles in the other effect)
      const pinClass = isSelected
        ? "bg-brand-600 text-white border-2 border-brand-700 font-bold shadow-md rounded-full px-2.5 py-1 text-xs text-center whitespace-nowrap cursor-pointer transition transform scale-110"
        : "bg-white text-brand-600 border-2 border-brand-500 font-semibold shadow-sm hover:shadow hover:border-brand-600 rounded-full px-2.5 py-1 text-xs text-center whitespace-nowrap cursor-pointer transition";

      const customIcon = L.divIcon({
        html: `<div class="${pinClass}">${priceText}</div>`,
        className: "custom-price-pin-icon",
        iconSize: [65, 30],
        iconAnchor: [32, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .on("click", () => {
          onSelectHotel(hotel.id);
        });

      markersRef.current[hotel.id] = marker;
      bounds.extend([lat, lng]);
    });

    // Fit map bounds to show all markers if any exist and no hotel is selected
    const hasCoords = hotels.some(
      (h) =>
        h.latitude != null &&
        h.longitude != null &&
        !isNaN(Number(h.latitude)) &&
        !isNaN(Number(h.longitude))
    );
    if (hasCoords && !selectedHotelId) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    prevSelectedHotelIdRef.current = selectedHotelId;
  }, [map, hotels]);

  // Handle selected hotel changes (updates marker icons dynamically without recreating them)
  useEffect(() => {
    if (!map) return;

    const prevId = prevSelectedHotelIdRef.current;
    const nextId = selectedHotelId;

    if (prevId === nextId) return;

    // Reset previous selected marker style
    if (prevId && markersRef.current[prevId]) {
      const prevMarker = markersRef.current[prevId];
      const hotel = hotels.find((h) => h.id === prevId);
      if (hotel) {
        const prices = hotel.rooms?.map((r: any) => Number(r.price)).filter((p: number) => p > 0) ?? [];
        const minPrice = prices.length ? Math.min(...prices) : null;
        const priceText = minPrice ? `₹${Math.round(minPrice).toLocaleString("en-IN")}` : "₹--";
        const pinClass = "bg-white text-brand-600 border-2 border-brand-500 font-semibold shadow-sm hover:shadow hover:border-brand-600 rounded-full px-2.5 py-1 text-xs text-center whitespace-nowrap cursor-pointer transition";

        prevMarker.setIcon(
          L.divIcon({
            html: `<div class="${pinClass}">${priceText}</div>`,
            className: "custom-price-pin-icon",
            iconSize: [65, 30],
            iconAnchor: [32, 15],
          })
        );
      }
    }

    // Apply selected style to the newly hovered/selected marker
    if (nextId && markersRef.current[nextId]) {
      const nextMarker = markersRef.current[nextId];
      const hotel = hotels.find((h) => h.id === nextId);
      if (hotel) {
        const prices = hotel.rooms?.map((r: any) => Number(r.price)).filter((p: number) => p > 0) ?? [];
        const minPrice = prices.length ? Math.min(...prices) : null;
        const priceText = minPrice ? `₹${Math.round(minPrice).toLocaleString("en-IN")}` : "₹--";
        const pinClass = "bg-brand-600 text-white border-2 border-brand-700 font-bold shadow-md rounded-full px-2.5 py-1 text-xs text-center whitespace-nowrap cursor-pointer transition transform scale-110";

        nextMarker.setIcon(
          L.divIcon({
            html: `<div class="${pinClass}">${priceText}</div>`,
            className: "custom-price-pin-icon",
            iconSize: [65, 30],
            iconAnchor: [32, 15],
          })
        );

        // Pan to the selected marker
        map.setView(nextMarker.getLatLng(), Math.max(map.getZoom(), 14), {
          animate: true,
          duration: 0.5,
        });
      }
    }

    prevSelectedHotelIdRef.current = nextId;
  }, [map, selectedHotelId, hotels]);


  // Locate User GPS
  const handleLocate = () => {
    if (!map) return;
    setIsLocating(true);
    map.locate({ setView: true, maxZoom: 16 });
    map.once("locationfound", () => {
      setIsLocating(false);
    });
    map.once("locationerror", () => {
      setIsLocating(false);
      alert("Could not access your location.");
    });
  };

  // Custom Zoom Handlers
  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();

  // Selected hotel overlay details
  const overlayMinPrice = selectedHotel?.rooms?.length
    ? Math.min(...selectedHotel.rooms.map((r: any) => Number(r.price)))
    : null;

  const overlayRating = selectedHotel?.reviews?.length
    ? selectedHotel.reviews.reduce((a: number, b: any) => a + b.rating, 0) / selectedHotel.reviews.length
    : selectedHotel?.rating ?? null;

  const overlayPhotos = selectedHotel?.hotel_photos ?? [];
  const overlayImageUrl = overlayPhotos[0]?.url || selectedHotel?.image_url || "/placeholder-hotel.jpg";

  return (
    <div className="relative h-full w-full bg-slate-50 overflow-hidden">
      {/* Leaflet Container */}
      <div ref={mapRef} className="h-full w-full z-0" />

      {/* Floating Control: Search this area */}
      {showSearchArea && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setShowSearchArea(false)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-lg border border-slate-100 hover:bg-slate-50 transition"
          >
            <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* Floating Controls: Zoom and Locate (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {/* Locate button */}
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg border border-slate-100 hover:bg-slate-50 active:scale-95 transition"
          title="Locate me"
        >
          {isLocating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          ) : (
            <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        {/* Custom Zoom Controls & Fullscreen Toggle */}
        <div className="flex flex-col rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 active:scale-95 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          {setIsMapFullScreen && (
            <button
              onClick={() => setIsMapFullScreen(!isMapFullScreen)}
              className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50 border-t border-slate-105 active:scale-95 transition"
              title={isMapFullScreen ? "Exit Full Screen" : "Full Screen Map"}
            >
              {isMapFullScreen ? (
                <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M14 10h6m0 0V4m0 6l7-7M10 10H4m0 0V4m0 6L3 3" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Floating Stay Overlay (Bottom Left/Center) */}
      <AnimatePresence>
        {selectedHotel && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute bottom-4 left-4 right-16 md:right-auto md:w-80 z-10"
          >
            <div className="relative flex gap-3 rounded-2xl bg-white p-3 shadow-2xl border border-slate-100/90 overflow-hidden">
              {/* Close Overlay Button */}
              <button
                onClick={() => onSelectHotel(null)}
                className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer z-10"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Thumbnail */}
              <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                <Image src={overlayImageUrl} alt={selectedHotel.name} fill className="object-cover" />
              </div>

              {/* Stay Quick Details */}
              <div className="flex flex-col min-w-0 flex-1 pr-4 text-left">
                <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">
                  {selectedHotel.name}
                </h4>
                <p className="flex items-center gap-0.5 text-xs text-slate-400 mt-0.5">
                  <MapPinIcon className="h-3 w-3 text-slate-400" />
                  <span className="truncate">{selectedHotel.location}</span>
                </p>

                {overlayRating !== null && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-700">
                    <StarIcon className="h-3.5 w-3.5 text-gold-500" filled />
                    <span>{overlayRating.toFixed(1)}</span>
                    <span className="text-slate-400">
                      ({selectedHotel.reviews?.length ?? 0})
                    </span>
                  </div>
                )}

                <div className="flex items-baseline gap-1 mt-auto pt-1">
                  {overlayMinPrice !== null ? (
                    <>
                      <span className="text-sm font-extrabold text-slate-955">
                        ₹{overlayMinPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500">/ night</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-semibold">Price on request</span>
                  )}
                </div>
              </div>

              {/* Clickable Card Link */}
              <Link
                href={`/hotels/${selectedHotel.id}`}
                className="absolute inset-0 z-0 bg-transparent"
                aria-label="View hotel details"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
