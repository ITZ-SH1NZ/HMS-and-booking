import type { StaffPermission } from "@/lib/types";

export interface AssignmentRow {
  id: string;
  hotelId: string;
  hotelName: string;
  permissions: StaffPermission[];
}
export interface StaffMember {
  email: string;
  assignments: AssignmentRow[];
}
export interface InviteRow {
  id: string;
  email: string;
  hotelId: string;
  hotelName: string;
  permissions: StaffPermission[];
  token: string;
  expiresAt: string;
}
export interface StaffData {
  hotels: { id: string; name: string }[];
  staff: StaffMember[];
  invites: InviteRow[];
}
