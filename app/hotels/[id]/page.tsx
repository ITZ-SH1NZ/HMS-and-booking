import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicHotel } from "@/lib/hotels";
import { MapPinIcon, StarIcon } from "@/components/icons";
import { parseAmenities, getTopAmenities } from "@/lib/amenityCatalog";
import { Price } from "@/components/Price";

// Section Components
import { Breadcrumb } from "./components/Breadcrumb";
import { HotelPhotosHeader } from "./components/HotelPhotosHeader";
import { TitleActions } from "./components/TitleActions";
import { ListingTabContainer } from "./components/ListingTabContainer";

export const dynamic = "force-dynamic";

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch full details for public view
  const detail = await getPublicHotel(id, user?.id);

  if (!detail) notFound();

  const { hotel, photos, avgRating, reviewCount, isGuestFavourite } = detail;
  const parsedAmenities = parseAmenities(hotel.amenities);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 lg:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb navigation */}
        <Breadcrumb state={hotel.state ?? null} city={hotel.city ?? null} hotelName={hotel.name} />

        {/* Title, Badge & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {hotel.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-bold text-rose-700 shadow-sm whitespace-nowrap">
                {hotel.star_rating ? `${hotel.star_rating} Star ` : ""}{hotel.property_type || "Hotel"}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-500 flex items-center gap-1 flex-wrap">
              <MapPinIcon className="h-4.5 w-4.5 text-rose-600 shrink-0" />
              <span>
                {hotel.address_line ? `${hotel.address_line}, ` : ""}{hotel.city}, {hotel.state},{" "}
                {hotel.country}
              </span>
              <a href="#location" className="text-rose-600 hover:underline ml-1.5 transition">
                View on map
              </a>
            </p>
          </div>

          <TitleActions />
        </div>

        {/* Hero Photo Collage / Gallery Trigger */}
        <HotelPhotosHeader
          photos={photos}
          hotelName={hotel.name}
          fallbackImage={hotel.image_url}
          avgRating={avgRating}
          reviewCount={reviewCount}
          isGuestFavourite={isGuestFavourite}
        />

        {/* Guest Favourite Highlight Card */}
        {isGuestFavourite && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 flex items-start gap-4 shadow-sm">
            <div className="text-rose-500 shrink-0 mt-0.5">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Guest Favourite</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                One of the most loved properties on HMS, recognized for outstanding guest reviews, exceptional service, and amenities.
              </p>
            </div>
          </div>
        )}

        {/* Top Amenities Strip */}
        {parsedAmenities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-3 border-y border-slate-200">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2">
              Top Amenities:
            </span>
            {getTopAmenities(parsedAmenities, 7).map((amenity) => {
              const Icon = amenity.icon;
              return (
                <span
                  key={amenity.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {amenity.label}
                </span>
              );
            })}
            {parsedAmenities.length > 7 && (
              <a
                href="#amenities"
                className="text-xs font-bold text-rose-600 hover:underline transition ml-1"
              >
                +{parsedAmenities.length - 7} more
              </a>
            )}
          </div>
        )}

        {/* Tabed Content Switcher */}
        <ListingTabContainer
          hotel={hotel}
          rooms={detail.rooms}
          photos={photos}
          reviews={detail.reviews}
          host={detail.host}
          availabilityRule={detail.availabilityRule}
          avgRating={avgRating}
          reviewCount={reviewCount}
          ratingHistogram={detail.ratingHistogram}
          minPrice={detail.minPrice}
          isSuperhost={detail.isSuperhost}
          parsedAmenities={parsedAmenities}
        />
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div>
          {detail.minPrice !== null ? (
            <p className="text-sm font-black text-slate-900">
              <Price amount={detail.minPrice} />
              <span className="text-[10px] font-medium text-slate-500 ml-0.5">/ night</span>
            </p>
          ) : (
            <span className="text-xs font-bold text-slate-500">Contact property</span>
          )}
          {avgRating && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-slate-700">
              <StarIcon className="h-3 w-3 text-amber-500" filled />
              <span>{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <a
          href="#booking-widget-container"
          className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-3 text-xs font-bold text-white shadow-md hover:scale-[1.01] transition text-center"
        >
          Book Now
        </a>
      </div>
    </div>
  );
}

