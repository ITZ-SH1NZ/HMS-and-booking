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

export interface FrontDeskData {
  hotel: { id: string; name: string; location: string };
  rooms: FrontDeskRoom[];
  bookings: Booking[];
  permissions: StaffPermission[];
  isManager: boolean;
}
