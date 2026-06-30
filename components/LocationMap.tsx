"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  hotelName?: string;
}

// Rich, free, no-key OpenStreetMap vector tiles (ODbL). "positron" is the clean,
// muted, modern style — keeps street/place labels but drops the loud OSM colors,
// so it sits well with the luxury cream/green theme. (Swap for "liberty" /
// "bright" / "fiord" to taste.)
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
// CartoDB Voyager — the richest of our free raster basemaps. Used as the
// fallback engine (Leaflet) when the vector map fails to load.
const VOYAGER_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

// Shared Airbnb-style pin: black circle + white house glyph.
const PIN_HTML = `
  <div class="flex items-center justify-center h-10 w-10 rounded-full bg-slate-900 border-2 border-white shadow-xl text-white cursor-pointer">
    <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  </div>`;

type ZoomHandle = { zoomIn: () => void; zoomOut: () => void } | null;

/**
 * One interactive map surface. Tries MapLibre + OpenFreeMap (rich vector); if
 * that fails to load, transparently falls back to Leaflet + Voyager so the map
 * never disappears. Both engines share the same pin, popup and zoom controls.
 */
function MapCanvas({
  latitude,
  longitude,
  hotelName,
  interactive,
  onExpand,
  onClose,
}: {
  latitude: number;
  longitude: number;
  hotelName: string;
  interactive: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomHandle>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  // Which rendering engine is active. Starts on the rich vector map and only
  // drops to Leaflet if OpenFreeMap errors out.
  const [engine, setEngine] = useState<"maplibre" | "leaflet">("maplibre");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const container = containerRef.current;
    let disposed = false;
    let cleanup = () => {};

    const initMapLibre = async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (disposed) return;

        const map = new maplibregl.Map({
          container,
          style: OPENFREEMAP_STYLE,
          center: [longitude, latitude],
          zoom: 15,
          attributionControl: { compact: true }, // ODbL attribution, compact
          dragRotate: false,
          pitchWithRotate: false,
          maxZoom: 19,
        });
        map.touchZoomRotate.disableRotation();
        map.keyboard.disable();
        if (!interactive) map.scrollZoom.disable();

        // Bail to the Leaflet fallback if the style/tiles fail to load.
        const failTimer = setTimeout(() => {
          if (!disposed && !map.isStyleLoaded()) {
            map.remove();
            setEngine("leaflet");
          }
        }, 7000);

        map.on("error", (e) => {
          // Only treat a missing style as fatal — transient tile errors are fine.
          if (!disposed && !map.isStyleLoaded()) {
            clearTimeout(failTimer);
            map.remove();
            setEngine("leaflet");
          } else {
            console.warn("maplibre tile warning", e?.error?.message ?? e);
          }
        });

        map.on("load", () => {
          if (disposed) return;
          clearTimeout(failTimer);
          map.resize();
          setReady(true);

          // Luxury brand wash over the positron base. We iterate the live style
          // and recolour by layer type + id pattern, so it adapts to whatever
          // ids the style ships (unknown/odd layers are simply skipped). Labels
          // are left untouched for legibility — gold is an accent, not text.
          const CREAM = "#F8F7F4"; // canvas
          const WATER = "#D7E3DD"; // soft brand-tinted water
          const GREEN = "#E3ECE1"; // muted sage greenery
          const STONE = "#EDE8DE"; // warm stone buildings
          const GOLD = "#C9A24D"; // brand gold — major roads only
          const set = (id: string, prop: string, val: string) => {
            if (!map.getLayer(id)) return;
            try {
              map.setPaintProperty(id, prop as never, val as never);
            } catch {
              /* layer exists but prop differs — ignore */
            }
          };
          for (const layer of map.getStyle().layers ?? []) {
            const { id, type } = layer;
            if (type === "background") set(id, "background-color", CREAM);
            else if (type === "fill") {
              if (/water/i.test(id)) set(id, "fill-color", WATER);
              else if (/park|grass|wood|forest|green|garden|cemetery|pitch|golf/i.test(id))
                set(id, "fill-color", GREEN);
              else if (/building/i.test(id)) set(id, "fill-color", STONE);
            } else if (type === "line") {
              if (/water|river|canal|stream/i.test(id)) set(id, "line-color", WATER);
              else if (/motorway|trunk/i.test(id)) set(id, "line-color", GOLD); // gold accent
            }
          }

          const el = document.createElement("div");
          el.innerHTML = PIN_HTML;
          new maplibregl.Marker({ element: el.firstElementChild as HTMLElement, anchor: "center" })
            .setLngLat([longitude, latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(
                `<div class="font-bold text-slate-800 text-xs px-1">${hotelName}</div>`,
              ),
            )
            .addTo(map);
        });

        zoomRef.current = { zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut() };
        const onResize = () => map.resize();
        window.addEventListener("resize", onResize);
        cleanup = () => {
          clearTimeout(failTimer);
          window.removeEventListener("resize", onResize);
          map.remove();
        };
      } catch (err) {
        console.error("maplibre load error", err);
        if (!disposed) setEngine("leaflet");
      }
    };

    const initLeaflet = async () => {
      try {
        const Leaflet = await import("leaflet");
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        if (disposed) return;

        const map = Leaflet.map(container, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: false,
          scrollWheelZoom: interactive,
          attributionControl: true,
        });
        Leaflet.tileLayer(VOYAGER_TILES, {
          maxZoom: 20,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);

        const icon = Leaflet.divIcon({ html: PIN_HTML, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
        Leaflet.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup(`<div class="font-bold text-slate-800 text-xs p-1">${hotelName}</div>`);

        setReady(true);
        zoomRef.current = { zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut() };
        cleanup = () => map.remove();
      } catch (err) {
        console.error("leaflet load error", err);
      }
    };

    setReady(false);
    if (engine === "maplibre") initMapLibre();
    else initLeaflet();

    return () => {
      disposed = true;
      zoomRef.current = null;
      cleanup();
    };
  }, [mounted, engine, interactive, latitude, longitude, hotelName]);

  return (
    <div className="relative h-full w-full min-h-[220px] overflow-hidden bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading / SSR skeleton */}
      {(!mounted || !ready) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="space-y-2 text-center text-slate-400">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span className="text-xs font-semibold text-slate-400">Loading map...</span>
          </div>
        </div>
      )}

      {/* Custom zoom controls (Airbnb style) */}
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          onClick={() => zoomRef.current?.zoomIn()}
          className="grid h-10 w-10 cursor-pointer select-none place-items-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomRef.current?.zoomOut()}
          className="grid h-10 w-10 cursor-pointer select-none place-items-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>

      {/* Expand to fullscreen (inline only) */}
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute left-4 top-4 z-10 flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Open fullscreen map"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          Fullscreen
        </button>
      )}

      {/* Close (fullscreen only) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Close fullscreen map"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function LocationMap({ latitude, longitude, hotelName = "Hotel Location" }: LocationMapProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Lock body scroll + Esc-to-close while the fullscreen map is open.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  return (
    <div className="relative z-0 h-full w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapCanvas
        latitude={latitude}
        longitude={longitude}
        hotelName={hotelName}
        interactive={false}
        onExpand={() => setFullscreen(true)}
      />

      {fullscreen &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex flex-col bg-white animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{hotelName}</p>
                <p className="text-xs text-slate-400">Scroll to zoom · drag to explore</p>
              </div>
            </div>
            <div className="relative flex-1">
              <MapCanvas
                latitude={latitude}
                longitude={longitude}
                hotelName={hotelName}
                interactive
                onClose={() => setFullscreen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
