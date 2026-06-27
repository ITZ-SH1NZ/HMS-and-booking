"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffPermission } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invite a person (by email) to one or more hotels with a set of permissions. */
export async function inviteStaff(
  email: string,
  hotelIds: string[],
  permissions: StaffPermission[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: "Enter a valid email address." };
  if (hotelIds.length === 0) return { ok: false, error: "Select at least one hotel." };
  if (permissions.length === 0) return { ok: false, error: "Select at least one permission." };

  const rows = hotelIds.map((hotel_id) => ({
    email: clean,
    hotel_id,
    permissions,
    invited_by: user.id,
  }));

  const { error } = await supabase.from("staff_invites").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/manager/staff");
  return { ok: true };
}

export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_invites").delete().eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manager/staff");
  return { ok: true };
}

export async function revokeAssignment(assignmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("hotel_staff").delete().eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manager/staff");
  return { ok: true };
}

export async function updateAssignmentPermissions(
  assignmentId: string,
  permissions: StaffPermission[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("hotel_staff").update({ permissions }).eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manager/staff");
  return { ok: true };
}
