// Shared TypeScript types for the BookNest app.

export type UserRole = "guest" | "manager" | "admin" | "staff";

// What an assigned staff member is allowed to do on a hotel.
export type StaffPermission = "offline_booking" | "view_occupancy" | "manage_rooms";

export type StaffInviteStatus = "pending" | "accepted" | "revoked" | "expired";

// A staff member's assignment to a single hotel.
export interface HotelStaff {
  id: string;
  hotel_id: string;
  staff_id: string;
  permissions: StaffPermission[];
  invited_by: string | null;
  created_at: string;
}

// A pending email invitation for a staff member.
export interface StaffInvite {
  id: string;
  email: string;
  hotel_id: string;
  permissions: StaffPermission[];
  token: string;
  status: StaffInviteStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

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

export type PropertyType = "Hotel" | "Resort" | "Villa" | "Apartment" | "Homestay" | "Guest house" | "Hostel";

export type PhotoCategory = "cover" | "exterior" | "lobby" | "rooms" | "restaurant" | "pool" | "amenities" | "bathroom" | "other";

export type PolicyChoice = "allowed" | "not_allowed" | "on_request" | "designated";

export type CancellationPolicy = "flexible" | "moderate" | "strict" | "custom";

export type PaymentPolicy = "pay_at_property" | "advance" | "both";

export interface HotelPhoto {
  id: string;
  hotel_id: string;
  url: string;
  category: PhotoCategory;
  sort_order: number;
  created_at: string;
}

export interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface PricingSeason {
  id: string;
  hotel_id: string;
  name: string | null;
  start_date: string;
  end_date: string;
  price: number;
  created_at: string;
}

export interface AdditionalCharge {
  id: string;
  hotel_id: string;
  label: string;
  amount: number;
  per: "night" | "stay" | "day" | "guest";
  created_at: string;
}

export interface AvailabilityRule {
  id: string;
  hotel_id: string;
  open_for_booking: boolean;
  advance_days: number | null;
  min_stay_weekday: number;
  min_stay_weekend: number;
  max_stay: number | null;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  hotel_id: string;
  date: string;
  reason: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  name: string;
  price: number;
  capacity: number;
  total_units: number;
  amenities: string[];
  created_at: string;
  // New fields
  short_description?: string | null;
  bedroom_type?: string | null;
  adults?: number;
  children?: number;
  room_size?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export type RoomDraft = Room;

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
  status: VerificationStatus | "draft";
  created_at: string;
  // New fields
  wizard_step?: number;
  property_type?: PropertyType | null;
  short_description?: string | null;
  detailed_description?: string | null;
  star_rating?: number | null;
  year_built?: number | null;
  languages_spoken?: string[];
  highlights?: string[];
  best_for?: string[];
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  address_line?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  amenities?: string[];
  check_in_time?: string | null;
  check_out_time?: string | null;
  min_age?: number | null;
  pets_policy?: PolicyChoice | string | null;
  smoking_policy?: PolicyChoice | string | null;
  parties_policy?: PolicyChoice | string | null;
  cancellation_policy?: CancellationPolicy | null;
  cancellation_policy_custom?: string | null;
  payment_policy?: PaymentPolicy | null;
  require_advance?: boolean;
  advance_amount?: number | null;
  advance_is_percent?: boolean;
  gst_percent?: number;
  service_charge_percent?: number;
  other_tax_percent?: number;
  terms_accepted?: boolean;
  published_at?: string | null;
  deleted_at?: string | null;
  deactivated_at?: string | null;
  deleted_reason?: string | null;
  deleted_note?: string | null;
}

export type HotelDraft = Hotel;

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

// ---------------------------------------------------------------------------
// Public listing page
// ---------------------------------------------------------------------------

// Safe subset of profiles exposed via public.public_profiles view.
export interface PublicProfile {
  id: string;
  full_name: string | null;
  created_at: string;
}

// Review with reviewer identity from get_hotel_reviews RPC.
export interface ReviewWithAuthor {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  reviewer_since: string;
}

// A nearby landmark stored in hotels.nearby_places jsonb.
export interface NearbyPlace {
  name: string;
  distance_km: number;
  type: string; // "airport" | "railway_station" | "beach" | "mall" | "hospital" etc.
}

// Room with its photos attached (for listing page room carousel).
export interface RoomWithPhotos extends Room {
  room_photos: RoomPhoto[];
}

// Full view-model for the public hotel listing page.
export interface PublicHotelDetail {
  hotel: Hotel & { nearby_places: NearbyPlace[] | null };
  rooms: RoomWithPhotos[];
  photos: HotelPhoto[];
  reviews: ReviewWithAuthor[];
  host: PublicProfile | null;
  availabilityRule: AvailabilityRule | null;
  // Derived aggregates
  avgRating: number | null;
  reviewCount: number;
  ratingHistogram: Record<number, number>; // { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
  minPrice: number | null;
  isGuestFavourite: boolean;
  isSuperhost: boolean;
}

// ---------------------------------------------------------------------------
// Booking system
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type PaymentMethod = "upi" | "card" | "wallet" | "cash";

export type BookingSource = "online" | "offline";

export interface Booking {
  id: string;
  guest_id: string | null;
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  num_rooms: number;
  room_price: number;
  base_price: number;
  gst: number;
  platform_fee: number;
  total_price: number;
  status: BookingStatus;
  special_requests: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  refund_amount: number | null;
  created_at: string;
  // Offline / walk-in bookings
  source?: BookingSource;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  created_by?: string | null;
}

// Booking joined with hotel/room/payment for display.
export interface BookingDetail extends Booking {
  hotels: Pick<Hotel, "id" | "name" | "location" | "image_url"> | null;
  rooms: Pick<Room, "id" | "name" | "capacity"> | null;
  payments: Payment[];
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  order_id: string | null;
  receipt: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
}

export interface RoomInventory {
  id: string;
  room_id: string;
  date: string;
  total_count: number;
  booked_count: number;
}

// One available room type for a chosen date range (from room_availability RPC).
export interface AvailabilityResult {
  room_id: string;
  name: string;
  price: number;
  capacity: number;
  amenities: string[];
  available: number;
}

// Payload the booking form submits to POST /api/bookings.
export interface BookingRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  numRooms: number;
  specialRequests?: string;
}

// Computed price breakdown shown in the UI (base currency).
export interface PriceQuote {
  roomPrice: number;
  nights: number;
  numRooms: number;
  base: number;
  gst: number;
  platformFee: number;
  total: number;
}
