import { createClient } from "@/lib/supabase/server";

// Resolves the signed-in user's id via getClaims() — which verifies the JWT
// locally (no Auth-server round trip when JWT signing keys are enabled), unlike
// getUser(). All manager reads are RLS-protected, so using the claim's `sub`
// to build queries is safe: a forged/expired token is rejected at PostgREST.
export async function getManagerContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  return { supabase, userId };
}

// Like getManagerContext, but also resolves whether the caller is an admin.
export async function getAdminContext() {
  const { supabase, userId } = await getManagerContext();
  if (!userId) return { supabase, userId: null, isAdmin: false };
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return { supabase, userId, isAdmin: data?.role === "admin" };
}
