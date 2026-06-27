import type { Hotel } from "@/lib/types";

export interface ManagerHotelCard extends Hotel {
  roomTypes: number;
  capacity: number;
  occupiedTonight: number;
}
