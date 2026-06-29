"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Submits a guest review for a hotel and automatically checks them out
 * if their booking status is currently 'checked_in'.
 */
export async function submitGuestReviewAndCheckout(
  bookingId: string,
  rating: number,
  comment: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Please log in to submit your review." };
    }

    // 2. Fetch booking to verify ownership and check status
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, guest_id, hotel_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) {
      return { ok: false, error: "Booking not found." };
    }

    // 3. Authorize: Only the guest who booked the room can submit the review
    if (booking.guest_id !== user.id) {
      return { ok: false, error: "You are not authorized to review this booking." };
    }

    // 4. Insert review into the reviews table
    const { error: reviewErr } = await supabase
      .from("reviews")
      .insert({
        hotel_id: booking.hotel_id,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

    if (reviewErr) {
      console.error("[review] insert error:", reviewErr);
      return { ok: false, error: "Failed to submit review. You may have already reviewed this hotel." };
    }

    // 5. Self-Checkout: If they are still checked in, complete their stay
    if (booking.status === "checked_in") {
      const admin = createAdminClient();
      const { error: checkoutErr } = await admin
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      if (checkoutErr) {
        console.error("[review] checkout update error:", checkoutErr);
        // We don't fail the whole request since the review succeeded,
        // but we log it.
      }
    }

    // Revalidate paths to update cached views
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath(`/manager/manage/${booking.hotel_id}`);

    return { ok: true };
  } catch (err) {
    console.error("[review] action error:", err);
    return { ok: false, error: "An unexpected error occurred. Please try again." };
  }
}
