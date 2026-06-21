import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  HotelWithStats,
  HotelCardData,
  Hotel,
  HotelPhoto,
  RoomWithPhotos,
  ReviewWithAuthor,
  PublicProfile,
  AvailabilityRule,
  NearbyPlace,
  PublicHotelDetail,
} from "@/lib/types";

// Cache tag used by every cached hotel read; bumped by revalidateHotels()
// whenever a hotel is approved, published, or edited.
export const HOTELS_CACHE_TAG = "hotels";

/**
 * Cached list of approved hotels for the homepage/catalog. Columns are narrowed
 * to what the card + in-memory location filter need. Cached under the "hotels"
 * tag with a 1h fallback revalidate; invalidated immediately on approve/publish.
 */
export const getApprovedHotelsCached = unstable_cache(
  async (): Promise<HotelWithStats[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("hotels")
      .select("id, name, location, image_url, city, state, rooms(price), reviews(rating)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    return (data as HotelWithStats[] | null) ?? [];
  },
  ["approved-hotels"],
  { tags: [HOTELS_CACHE_TAG], revalidate: 3600 },
);

// Collapse a hotel + its rooms/reviews into display-ready card data.
export function toHotelCard(hotel: HotelWithStats): HotelCardData {
  const prices = hotel.rooms?.map((r) => Number(r.price)).filter((p) => p > 0) ?? [];
  const ratings = hotel.reviews?.map((r) => r.rating) ?? [];

  const minPrice = prices.length ? Math.min(...prices) : null;
  const rating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
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

// ---------------------------------------------------------------------------
// Public hotel listing page — full data fetch
// ---------------------------------------------------------------------------

/**
 * Fetches everything needed for the public hotel detail / listing page.
 * Returns null if the hotel doesn't exist or isn't viewable by the caller.
 *
 * Access rules:
 *  - status='approved' → visible to everyone (anon + authenticated)
 *  - status='draft'|'pending'|'rejected' → visible only to the owning manager or admins
 */
async function assembleHotelDetail(
  supabase: SupabaseClient,
  hotelId: string,
  hotel: Hotel & { nearby_places: NearbyPlace[] | null },
): Promise<PublicHotelDetail> {
  // 2. Fetch related data in parallel
  const [
    { data: photosData },
    { data: roomsData },
    { data: reviewsData },
    { data: availData },
  ] = await Promise.all([
    // Hotel photos
    supabase
      .from("hotel_photos")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("sort_order", { ascending: true }),

    // Rooms with their photos (PostgREST embedded select)
    supabase
      .from("rooms")
      .select("*, room_photos(*)")
      .eq("hotel_id", hotelId)
      .order("sort_order", { ascending: true }),

    // Reviews with reviewer names (RPC)
    supabase.rpc("get_hotel_reviews", { p_hotel_id: hotelId }),

    // Availability rules
    supabase
      .from("availability_rules")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle(),
  ]);

  const photos = (photosData as HotelPhoto[] | null) ?? [];
  const rooms = (roomsData as RoomWithPhotos[] | null) ?? [];
  const reviews = (reviewsData as ReviewWithAuthor[] | null) ?? [];
  const availabilityRule = (availData as AvailabilityRule | null) ?? null;

  // 3. Fetch host profile from public_profiles view
  let host: PublicProfile | null = null;
  if (hotel.manager_id) {
    const { data: hostData } = await supabase
      .from("public_profiles")
      .select("id, full_name, created_at")
      .eq("id", hotel.manager_id)
      .maybeSingle();
    host = hostData as PublicProfile | null;
  }

  // 4. Compute aggregates
  const ratings = reviews.map((r) => r.rating);
  const reviewCount = ratings.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / reviewCount) * 10) / 10
      : null;

  // Rating histogram: { 5: count, 4: count, ..., 1: count }
  const ratingHistogram: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) ratingHistogram[r]++;
  }

  // Min price across active rooms
  const activePrices = rooms
    .filter((r) => r.is_active !== false)
    .map((r) => Number(r.price))
    .filter((p) => p > 0);
  const minPrice = activePrices.length ? Math.min(...activePrices) : null;

  // Guest favourite: avg >= 4.8 AND review count >= 5
  const isGuestFavourite = avgRating !== null && avgRating >= 4.8 && reviewCount >= 5;

  // Superhost: all hotels by this manager average >= 4.8 with >= 10 total reviews
  // We compute this from the current hotel's data as a lightweight proxy.
  // A full computation would query all hotels by the manager — defer if data is thin.
  let isSuperhost = false;
  if (hotel.manager_id) {
    const { data: managerHotels } = await supabase
      .from("hotels")
      .select("id")
      .eq("manager_id", hotel.manager_id)
      .eq("status", "approved");

    if (managerHotels && managerHotels.length > 0) {
      const hotelIds = managerHotels.map((h) => h.id);
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .in("hotel_id", hotelIds);

      if (allReviews && allReviews.length >= 10) {
        const allRatings = allReviews.map((r) => r.rating);
        const overallAvg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        isSuperhost = overallAvg >= 4.8;
      }
    }
  }

  return {
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
    isGuestFavourite,
    isSuperhost,
  };
}

/**
 * Cached public listing for an approved hotel, keyed by id and tagged "hotels".
 * Uses the cookie-free anon client so it's safe inside unstable_cache.
 */
const getApprovedHotelDetail = unstable_cache(
  async (hotelId: string): Promise<PublicHotelDetail | null> => {
    const supabase = createPublicClient();
    const { data: hotelData } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", hotelId)
      .eq("status", "approved")
      .maybeSingle();
    if (!hotelData) return null;
    const hotel = hotelData as Hotel & { nearby_places: NearbyPlace[] | null };
    return assembleHotelDetail(supabase as unknown as SupabaseClient, hotelId, hotel);
  },
  ["approved-hotel-detail"],
  { tags: [HOTELS_CACHE_TAG], revalidate: 3600 },
);

/**
 * Fetches everything needed for the public hotel detail / listing page.
 * Returns null if the hotel doesn't exist or isn't viewable by the caller.
 *
 * Access rules:
 *  - status='approved' → cached, visible to everyone (anon + authenticated)
 *  - status='draft'|'pending'|'rejected' → live read, visible only to the
 *    owning manager or admins
 */
export async function getPublicHotel(
  hotelId: string,
  userId?: string | null,
): Promise<PublicHotelDetail | null> {
  // Fast path: cached public listing for approved hotels.
  const cached = await getApprovedHotelDetail(hotelId);
  if (cached) return cached;

  // Fallback: live read for owner/admin previewing a non-approved draft.
  const supabase = await createClient();
  const { data: hotelData } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", hotelId)
    .maybeSingle();
  if (!hotelData) return null;

  const hotel = hotelData as Hotel & { nearby_places: NearbyPlace[] | null };

  if (hotel.status !== "approved") {
    if (!userId) return null;
    if (hotel.manager_id !== userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!profile || profile.role !== "admin") return null;
    }
  }

  return assembleHotelDetail(supabase as unknown as SupabaseClient, hotelId, hotel);
}
