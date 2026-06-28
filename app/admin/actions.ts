"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOTELS_CACHE_TAG } from "@/lib/hotels";
import type { UserRole, VerificationStatus } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function reviewManager(
  id: string,
  decision: Extract<VerificationStatus, "approved" | "rejected" | "more_info">,
  note?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_manager", { p_id: id, p_decision: decision, p_note: note ?? null });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reviewHotel(
  id: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_hotel", { p_id: id, p_decision: decision, p_reason: reason ?? null });
  if (error) return { ok: false, error: error.message };
  updateTag(HOTELS_CACHE_TAG);
  return { ok: true };
}

export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setUserSuspended(userId: string, suspended: boolean, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspended", {
    p_user: userId,
    p_suspended: suspended,
    p_reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Returns a short-lived signed URL for a verification document (admin-only via
// storage RLS). Used by the inline document viewer.
export async function getDocumentUrl(path: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("manager-documents").createSignedUrl(path, 300);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
