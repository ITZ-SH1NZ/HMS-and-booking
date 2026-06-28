import type { Booking, StaffPermission } from "@/lib/types";

export interface FrontDeskRoom {
  id: string;
  name: string;
  price: number;
  total_units: number;
  capacity: number;
  adults: number;
  children: number;
}

// A booking with the guest's real name/phone resolved server-side (online
// guests' profiles aren't readable by managers via RLS).
export interface FrontDeskBooking extends Booking {
  display_name: string;
  display_phone: string | null;
}

export interface FrontDeskData {
  hotel: { id: string; name: string; location: string };
  rooms: FrontDeskRoom[];
  bookings: FrontDeskBooking[];
  permissions: StaffPermission[];
  isManager: boolean;
}
