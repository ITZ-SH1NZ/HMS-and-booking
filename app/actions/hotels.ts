"use server";

import { updateTag } from "next/cache";
import { HOTELS_CACHE_TAG } from "@/lib/hotels";

/**
 * Drops every cached hotel read (catalog + listing detail). Call after any
 * change that affects what the public sees: approve/reject, publish, or edit.
 * Safe to call from client components — it's a server action. `updateTag`
 * (Next 16) gives read-your-own-writes semantics from within a server action.
 */
export async function revalidateHotels() {
  updateTag(HOTELS_CACHE_TAG);
}
