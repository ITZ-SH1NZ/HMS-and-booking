"use server";

import { updateTag } from "next/cache";
import { getManagerContext } from "@/lib/authServer";
import { HOTELS_CACHE_TAG } from "@/lib/hotels";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface DeletionImpact {
  roomTypes: number;
  staffCount: number;
  totalBookings: number;
  activeBookings: number;
}

const ACTIVE_STATUSES = ["pending", "confirmed", "checked_in"];

/** Counts the things a deletion would affect, for the impact step of the flow. */
export async function getDeletionImpact(hotelId: string): Promise<DeletionImpact | { error: string }> {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  const [rooms, staff, total, active] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
    supabase.from("hotel_staff").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .in("status", ACTIVE_STATUSES)
      .gte("check_out", today),
  ]);

  return {
    roomTypes: rooms.count ?? 0,
    staffCount: staff.count ?? 0,
    totalBookings: total.count ?? 0,
    activeBookings: active.count ?? 0,
  };
}

/** Reversibly unpublish a hotel — hidden from guests, all data kept. */
export async function deactivateHotel(hotelId: string): Promise<ActionResult> {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("hotels")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", hotelId)
    .eq("manager_id", userId);

  if (error) return { ok: false, error: error.message };
  updateTag(HOTELS_CACHE_TAG);
  return { ok: true };
}

/** Re-publish a deactivated hotel. */
export async function reactivateHotel(hotelId: string): Promise<ActionResult> {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("hotels")
    .update({ deactivated_at: null })
    .eq("id", hotelId)
    .eq("manager_id", userId);

  if (error) return { ok: false, error: error.message };
  updateTag(HOTELS_CACHE_TAG);
  return { ok: true };
}

/**
 * Soft-deletes a hotel with a recorded reason. Blocked if the hotel has any
 * upcoming/active bookings, so we never orphan a guest's stay.
 */
export async function deleteHotel(
  hotelId: string,
  reason: string,
  note?: string,
): Promise<ActionResult> {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return { ok: false, error: "Not authenticated" };
  if (!reason) return { ok: false, error: "A reason is required." };

  const today = new Date().toISOString().slice(0, 10);
  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId)
    .in("status", ACTIVE_STATUSES)
    .gte("check_out", today);

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This hotel has ${count} active or upcoming booking(s). Cancel or complete them before deleting.`,
    };
  }

  const { error } = await supabase
    .from("hotels")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: reason,
      deleted_note: note ?? null,
    })
    .eq("id", hotelId)
    .eq("manager_id", userId);

  if (error) return { ok: false, error: error.message };
  updateTag(HOTELS_CACHE_TAG);
  return { ok: true };
}
