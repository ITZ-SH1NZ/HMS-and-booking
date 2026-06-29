// Shared TypeScript types for the HMS app.

export type UserRole = "guest" | "manager" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  dob: string | null;
  location: string | null;
  created_at: string;
}

export interface ManagerVerification {
  id: string;
  user_id: string;
  business_name: string | null;
  registration_number: string | null;
  business_address: string | null;
  document_url: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Room {
  id: string;
  hotel_id: string;
  name: string;
  price: number;
  capacity: number;
  created_at: string;
}

export interface Review {
  id: string;
  hotel_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Hotel {
  id: string;
  manager_id: string;
  name: string;
  description: string | null;
  location: string;
  image_url: string | null;
  status: VerificationStatus;
  created_at: string;
}

// Hotel joined with its rooms/reviews, as returned by the landing-page query.
export interface HotelWithStats extends Hotel {
  rooms: Pick<Room, "price">[];
  reviews: Pick<Review, "rating">[];
}

// Derived, display-ready hotel data.
export interface HotelCardData {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
  minPrice: number | null;
  rating: number | null;
  reviewCount: number;
}

export interface ExploreHotel {
  id: string;
  manager_id: string;
  name: string;
  description: string | null;
  location: string;
  image_url: string | null;
  status: VerificationStatus;
  created_at: string;
  property_type: string | null;
  star_rating: number | null;
  amenities: any;
  latitude: number | null;
  longitude: number | null;
  cancellation_policy: string | null;
  city: string | null;
  state: string | null;
  area: string | null;
  payment_policy: string | null;
  gst_percent: number;
  rooms: { price: number }[];
  reviews: { rating: number }[];
  hotel_photos: { url: string; category: string; sort_order: number }[];
}

