"use client";

import { useState, useEffect } from "react";
import { OverviewSection } from "./OverviewSection";
import { RoomCarousel } from "./RoomCarousel";
import { AmenitiesSection } from "./AmenitiesSection";
import { PhotosSection } from "./PhotosSection";
import { LocationSection } from "./LocationSection";
import { PoliciesSection } from "./PoliciesSection";
import { ReviewsSection } from "./ReviewsSection";
import { BookingWidget } from "./BookingWidget";
import { HostCard } from "./HostCard";
import LocationMap from "@/components/LocationMap";
import type {
  Hotel,
  RoomWithPhotos,
  HotelPhoto,
  ReviewWithAuthor,
  PublicProfile,
  AvailabilityRule,
  NearbyPlace,
} from "@/lib/types";

interface ListingTabContainerProps {
  hotel: Hotel & { nearby_places: NearbyPlace[] | null };
  rooms: RoomWithPhotos[];
  photos: HotelPhoto[];
  reviews: ReviewWithAuthor[];
  host: PublicProfile | null;
  availabilityRule: AvailabilityRule | null;
  avgRating: number | null;
  reviewCount: number;
  ratingHistogram: Record<number, number>;
  minPrice: number | null;
  isSuperhost: boolean;
  parsedAmenities: string[];
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms & rates" },
  { id: "amenities", label: "Amenities" },
  { id: "photos", label: "Photos" },
  { id: "location", label: "Location" },
  { id: "policies", label: "Policies" },
  { id: "reviews", label: "Reviews" },
] as const;

export function ListingTabContainer({
  hotel,
  rooms,
  photos,
  reviews,
  host,
  availabilityRule,
  avgRating,
  reviewCount,
  ratingHistogram,
  minPrice,
  isSuperhost,
  parsedAmenities,
}: ListingTabContainerProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Smooth scroll back to content container top so the switched tab is fully visible
    const container = document.getElementById("tab-content-start");
    if (container) {
      const offset = 140; // Height of navbar + tab bar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = container.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  // Support jumping to tabs via URL anchors (e.g. #location, #amenities)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && SECTIONS.some((s) => s.id === hash)) {
        setActiveTab(hash);
        
        // Wait briefly for content to render before scrolling
        setTimeout(() => {
          const container = document.getElementById("tab-content-start");
          if (container) {
            const offset = 140; // Height of navbar + tab bar
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = container.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth",
            });
          }
        }, 50);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sticky Tab bar */}
      <nav
        className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:mx-0 lg:px-0"
        aria-label="Page sections"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            {SECTIONS.map((section) => {
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleTabChange(section.id)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-rose-600 text-rose-600"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Anchor element for smooth scroll target */}
      <div id="tab-content-start" className="scroll-mt-36" />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left Column: Tab panel switcher */}
        <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div key={activeTab} className="animate-tab-fade">
            {activeTab === "overview" && (
              <OverviewSection hotel={hotel} availabilityRule={availabilityRule} />
            )}

            {activeTab === "rooms" && (
              <RoomCarousel rooms={rooms} hotelId={hotel.id} />
            )}

            {activeTab === "amenities" && (
              <AmenitiesSection amenities={parsedAmenities} />
            )}

            {activeTab === "photos" && (
              <PhotosSection photos={photos} hotelName={hotel.name} />
            )}

            {activeTab === "location" && (
              <LocationSection hotel={hotel} />
            )}

            {activeTab === "policies" && (
              <PoliciesSection hotel={hotel} />
            )}

            {activeTab === "reviews" && (
              <ReviewsSection
                hotelId={hotel.id}
                reviews={reviews}
                avgRating={avgRating}
                reviewCount={reviewCount}
                ratingHistogram={ratingHistogram}
              />
            )}
          </div>
        </div>

        {/* Right Column: Sticky Sidebar Info */}
        <div className="space-y-6 lg:sticky lg:top-36 self-start">
          <div id="booking-widget-container">
            <BookingWidget
              hotel={hotel}
              minPrice={minPrice}
              avgRating={avgRating}
              reviewCount={reviewCount}
              availabilityRule={availabilityRule}
            />
          </div>

          <HostCard host={host} isSuperhost={isSuperhost} />

          {/* Compact Mini Map Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition duration-300 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Property Location
            </h4>
            <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-200">
              {hotel.latitude && hotel.longitude ? (
                <LocationMap latitude={hotel.latitude} longitude={hotel.longitude} hotelName={hotel.name} />
              ) : (
                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  Map coordinates unavailable
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleTabChange("location")}
              className="w-full text-center text-xs font-bold text-rose-600 hover:underline transition cursor-pointer"
            >
              View full map & nearby places
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
