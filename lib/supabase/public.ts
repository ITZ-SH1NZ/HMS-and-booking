import { createClient } from "@supabase/supabase-js";

// Stateless, cookie-free Supabase client using the public anon key. RLS still
// applies (anon can only read approved hotels and other public rows). Safe to
// use inside `unstable_cache`, which must not touch request-bound data like
// cookies — unlike the SSR `server.ts` client.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
