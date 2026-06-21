"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { NavigationIcon } from "@/components/icons";

interface NominatimAddress {
  country?: string;
  state?: string;
  state_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  postcode?: string;
  road?: string;
  pedestrian?: string;
  suburb?: string;
  neighbourhood?: string;
  building?: string;
  hotel?: string;
  house_name?: string;
  amenity?: string;
  shop?: string;
}

interface NominatimResult {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

interface LeafletMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onAddressResolved?: (address: {
    country: string;
    state: string;
    city: string;
    pincode: string;
    address_line: string;
  }) => void;
}

// Static Nominatim fetch helpers defined outside the component to avoid hook dependency issues
async function fetchReverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "User-Agent": "BookNest-Booking-App/1.0" } }
    );
    if (!res.ok) throw new Error("Reverse geocode failed");
    return await res.json();
  } catch (err) {
    console.error("Reverse geocoding fetch error:", err);
    return null;
  }
}

// Parse Nominatim Address details into structured form fields
function parseNominatimAddress(result: NominatimResult) {
  const address = result.address || {};
  
  const country = address.country || "";
  const state = address.state || address.state_district || "";
  const city = address.city || address.town || address.village || address.municipality || address.county || "";
  const postcode = address.postcode || "";
  
  // Build a neat street address line
  const road = address.road || address.pedestrian || address.suburb || address.neighbourhood || "";
  const building = address.building || address.hotel || address.house_name || address.amenity || address.shop || "";
  const addressLine = [building, road].filter(Boolean).join(", ") || result.display_name.split(",")[0] || "";

  return {
    country,
    state,
    city,
    pincode: postcode,
    address_line: addressLine,
  };
}

export default function LeafletMap({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Live Location Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Cancels superseded in-flight requests so a slow earlier response can't
  // overwrite a newer one, and caches recent queries for instant repeats.
  const abortRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, NominatimResult[]>>(new Map());

  const defaultLat = latitude || 9.9312; // Default Cochin/Kerala coordinates
  const defaultLng = longitude || 76.2673;

  const initCoordsRef = useRef({ lat: defaultLat, lng: defaultLng });
  const onChangeRef = useRef(onChange);
  const onAddressResolvedRef = useRef(onAddressResolved);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onAddressResolvedRef.current = onAddressResolved;
  }, [onAddressResolved]);

  // Click outside to close search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search fetcher with proximity biasing based on map bounds
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      // Drop any in-flight request and reset.
      abortRef.current?.abort();
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }

    // Serve repeated queries from cache instantly — no network, no spinner.
    const cached = searchCacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      setSuggestions(cached);
      setShowSuggestions(true);
      setSearching(false);
      return;
    }

    // Determine current viewport bounding box for local prioritization (bias, bounded=0)
    let viewboxStr = "";
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      viewboxStr = `&viewbox=${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
    } else {
      const biasLat = latitude || defaultLat;
      const biasLng = longitude || defaultLng;
      const delta = 1.0; // ~100km box around active coords
      viewboxStr = `&viewbox=${biasLng - delta},${biasLat + delta},${biasLng + delta},${biasLat - delta}`;
    }

    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      // Cancel the previous request so out-of-order responses can't win.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=8${viewboxStr}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data: NominatimResult[] = await res.json();
        searchCacheRef.current.set(trimmed.toLowerCase(), data || []);
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (err) {
        // Ignore aborts — they're expected when the user keeps typing.
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Geocoding search error:", err);
      } finally {
        // Only the current (non-aborted) request clears the spinner.
        if (abortRef.current === controller) setSearching(false);
      }
    }, 400);
  };

  // Select suggestion handler
  const handleSelectSuggestion = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) return;

    setSearchQuery(result.display_name);
    setShowSuggestions(false);

    // Pan map & Move marker
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
      markerInstanceRef.current.setLatLng([lat, lng]);
    }

    // Trigger state callbacks
    onChangeRef.current(lat, lng);
    if (onAddressResolvedRef.current) {
      const parsed = parseNominatimAddress(result);
      onAddressResolvedRef.current(parsed);
    }
  };

  // Initialize Map
  useEffect(() => {
    // Inject Leaflet CSS stylesheet dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let isMounted = true;

    const initMap = async () => {
      try {
        const Leaflet = await import("leaflet");

        if (!isMounted || !mapContainerRef.current) return;

        // Initialize Map Instance
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = Leaflet.map(mapContainerRef.current, {
            center: [initCoordsRef.current.lat, initCoordsRef.current.lng],
            zoom: 13,
            zoomControl: true,
          });

          // Use modern CartoDB Voyager tiles (clean, fast vector-styled tiles)
          Leaflet.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: "abcd",
              maxZoom: 20,
            }
          ).addTo(mapInstanceRef.current);
        }

        // Custom Emerald SVG Marker Icon
        const customIcon = Leaflet.divIcon({
          html: `
            <div class="text-brand-700 drop-shadow-lg">
               <svg class="h-9 w-9 filter drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
               </svg>
            </div>
          `,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        // Set or move draggable marker
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([initCoordsRef.current.lat, initCoordsRef.current.lng]);
        } else {
          markerInstanceRef.current = Leaflet.marker(
            [initCoordsRef.current.lat, initCoordsRef.current.lng],
            {
              draggable: true,
              icon: customIcon,
            }
          ).addTo(mapInstanceRef.current);

          // Update coords and reverse geocode on marker drag release
          markerInstanceRef.current.on("dragend", async () => {
            if (markerInstanceRef.current) {
              const position = markerInstanceRef.current.getLatLng();
              onChangeRef.current(position.lat, position.lng);
              
              const geoData = await fetchReverseGeocode(position.lat, position.lng);
              if (geoData && onAddressResolvedRef.current) {
                const parsed = parseNominatimAddress(geoData);
                onAddressResolvedRef.current(parsed);
              }
            }
          });
        }

        setMapLoaded(true);
      } catch (err) {
        console.error("Leaflet load error", err);
        setLoadError(true);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  // Update map center when coordinates are changed externally
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && markerInstanceRef.current && latitude && longitude) {
      const curLatLng = markerInstanceRef.current.getLatLng();
      // Only pan if delta is meaningful to prevent jumpiness on slow inputs
      if (Math.abs(curLatLng.lat - latitude) > 0.0001 || Math.abs(curLatLng.lng - longitude) > 0.0001) {
        mapInstanceRef.current.setView([latitude, longitude], 15);
        markerInstanceRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude, mapLoaded]);

  // Request browser geolocation and auto-fill address
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onChange(lat, lng);
        
        const geoData = await fetchReverseGeocode(lat, lng);
        if (geoData && onAddressResolvedRef.current) {
          const parsed = parseNominatimAddress(geoData);
          onAddressResolvedRef.current(parsed);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        alert("Failed to retrieve your location. Please type manually.");
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Map Header with Geolocation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-sm font-extrabold text-slate-800">
          Pin property location <span className="text-brand-500">*</span>
        </span>
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="flex items-center gap-1.5 text-xs font-bold text-brand-800 bg-brand-50 px-3.5 py-2 rounded-xl border border-brand-200 hover:bg-brand-100 transition shrink-0"
        >
          <NavigationIcon className="h-3.5 w-3.5" />
          Use my current location
        </button>
      </div>

      {/* Modern Location Search Bar */}
      <div ref={searchContainerRef} className="relative w-full z-[1010]">
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 pl-10 pr-10 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 shadow-sm"
            placeholder="Search address, school, landmarks, cities..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
          />
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {/* Spinner or Clear Icon */}
          <div className="absolute inset-y-0 right-3 flex items-center">
            {searching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* Suggestion Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-fadeIn z-[1020]">
            {suggestions.map((result, idx) => (
              <button
                key={result.place_id || idx}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs text-slate-700 font-semibold transition flex flex-col gap-0.5"
                onClick={() => handleSelectSuggestion(result)}
              >
                <span className="text-slate-900 font-bold text-[13px]">
                  {result.display_name.split(",")[0]}
                </span>
                <span className="text-slate-500 font-medium line-clamp-1">
                  {result.display_name.split(",").slice(1).join(",").trim()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 h-80 shadow-sm z-0">
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center h-full">
            <span className="text-sm font-bold text-slate-700">
              Interactive Map Loading Failed
            </span>
            <span className="text-xs text-slate-400 mt-1 font-semibold">
              Please enter coordinates manually below.
            </span>
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full z-0" />
        )}
      </div>

      {/* Manual Coordinates Input Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 font-semibold"
            value={latitude !== null ? latitude : ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange(!isNaN(val) ? val : 0, longitude || 0);
            }}
            placeholder="e.g. 9.9312"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 font-semibold"
            value={longitude !== null ? longitude : ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange(latitude || 0, !isNaN(val) ? val : 0);
            }}
            placeholder="e.g. 76.2673"
            required
          />
        </div>
      </div>
    </div>
  );
}
