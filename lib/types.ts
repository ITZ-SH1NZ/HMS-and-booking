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
  total_units: number;
  amenities: string[];
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

export type PaymentMethod = "upi" | "card" | "wallet";

export interface Booking {
  id: string;
  guest_id: string;
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
