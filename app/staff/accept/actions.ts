"use server";

import { createClient } from "@/lib/supabase/server";

export interface AcceptResult {
  ok: boolean;
  count?: number;
  error?: string;
}

/** Accepts every pending staff invite addressed to the signed-in user's email. */
export async function acceptInvites(): Promise<AcceptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to accept your invite." };

  const { data, error } = await supabase.rpc("accept_my_staff_invites");
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: (data as number) ?? 0 };
}
