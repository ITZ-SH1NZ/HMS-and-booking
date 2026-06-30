"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function checkInBooking(hotelId: string, bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/manager/manage/${hotelId}`);
  return { ok: true };
}

export async function checkOutBooking(hotelId: string, bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_out_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/manager/manage/${hotelId}`);
  return { ok: true };
}

export async function confirmBookingPayment(hotelId: string, bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_booking_payment", { p_booking_id: bookingId });
  if (error) return { ok: false, error: error.message };
  
  // Trigger booking confirmation email (non-blocking)
  const { sendBookingConfirmation } = await import("@/lib/emails/bookingConfirmation");
  await sendBookingConfirmation(bookingId);

  revalidatePath(`/manager/manage/${hotelId}`);
  return { ok: true };
}

export async function cancelHotelBooking(
  hotelId: string,
  bookingId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason || "Cancelled at front desk",
  });
  if (error) return { ok: false, error: error.message };

  // Trigger booking cancellation email (non-blocking)
  const { sendBookingCancellation } = await import("@/lib/emails/bookingCancellation");
  await sendBookingCancellation(bookingId);

  revalidatePath(`/manager/manage/${hotelId}`);
  return { ok: true };
}

export interface OfflineBookingInput {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  numRooms: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  method: "cash" | "upi" | "card";
  paid: boolean;
  special?: string;
}

export async function createOfflineBooking(input: OfflineBookingInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_offline", {
    p_room_id: input.roomId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests: input.guests,
    p_num_rooms: input.numRooms,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone ?? null,
    p_guest_email: input.guestEmail ?? null,
    p_method: input.method,
    p_paid: input.paid,
    p_special: input.special ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const bookingId = data as string;

  // Trigger booking confirmation email if paid & confirmed (non-blocking)
  if (bookingId && input.paid) {
    const { sendBookingConfirmation } = await import("@/lib/emails/bookingConfirmation");
    await sendBookingConfirmation(bookingId);
  }

  revalidatePath(`/manager/manage/${input.hotelId}`);
  return { ok: true, id: bookingId };
}
