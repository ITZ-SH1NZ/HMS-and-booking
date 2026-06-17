import type { HotelWithStats, HotelCardData } from "@/lib/types";

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
