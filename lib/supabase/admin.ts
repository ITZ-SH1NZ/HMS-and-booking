import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. ONLY use in trusted server contexts
// (e.g. verified webhooks) where there is no user session. Never expose the
// service role key to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
