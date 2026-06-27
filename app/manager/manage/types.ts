import type { UserRole } from "@/lib/types";

export interface PickerHotel {
  id: string;
  name: string;
  location: string;
  arrivals: number;
  departures: number;
  inHouse: number;
}

export interface ManagePickerData {
  role: UserRole;
  hotels: PickerHotel[];
}
