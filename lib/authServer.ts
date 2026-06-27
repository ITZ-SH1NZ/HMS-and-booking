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
