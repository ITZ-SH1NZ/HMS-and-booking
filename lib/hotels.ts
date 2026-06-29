import type { HotelWithStats, HotelCardData, ExploreHotel } from "@/lib/types";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Direct supabase client to bypass cookies inside unstable_cache context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Fetch approved hotels, caching for 1 hour, tag "hotels"
export const getApprovedHotelsCached = unstable_cache(
  async (): Promise<ExploreHotel[]> => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("hotels")
      .select(`
        id,
        manager_id,
        name,
        description,
        location,
        image_url,
        status,
        created_at,
        property_type,
        star_rating,
        amenities,
        latitude,
        longitude,
        cancellation_policy,
        city,
        state,
        area,
        payment_policy,
        gst_percent,
        rooms (price),
        reviews (rating),
        hotel_photos (url, category, sort_order)
      `)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching approved hotels in cache path:", error.message);
      throw error;
    }
    return (data as any[]) ?? [];
  },
  ["approved-hotels-explore"],
  { revalidate: 3600, tags: ["hotels"] }
);

// Collapse a hotel + its rooms/reviews into display-ready card data.
export function toHotelCard(hotel: any): HotelCardData {
  const prices = hotel.rooms?.map((r: any) => Number(r.price)).filter((p: number) => p > 0) ?? [];
  const ratings = hotel.reviews?.map((r: any) => r.rating) ?? [];

  const minPrice = prices.length ? Math.min(...prices) : null;
  const rating = ratings.length
    ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
    : null;

  return {
    id: hotel.id,
    name: hotel.name,
    location: hotel.location,
    image_url: hotel.image_url,
    minPrice,
    rating,
    reviewCount: ratings.length,
  };
}

// Robust helper to parse different formats of amenities from Supabase
export function parseAmenities(amenities: any): string[] {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  if (typeof amenities === "string") {
    const trimmed = amenities.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => item.replace(/"/g, "").trim())
        .filter(Boolean);
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return [];
      }
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
