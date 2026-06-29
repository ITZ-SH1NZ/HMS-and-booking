import { loadEnvConfig } from "@next/env";
import { createAdminClient } from "./lib/supabase/admin";

loadEnvConfig(process.cwd());

async function main() {
  const admin = createAdminClient();

  console.log("Fetching function definition for public.get_hotel_reviews...");
  const { data, error } = await admin
    .rpc("get_hotel_reviews_def_raw"); // We will query via SQL query

  // Run a raw SQL query using a temporary RPC or query if available.
  // Since we don't have a direct SQL RPC, we can query it by running a select
  // on pg_proc.
  const { data: procData, error: procErr } = await admin
    .from("reviews") // We can use any table to run a select with raw sql if we had one,
    // but since Supabase client doesn't support raw SQL, let's write a query using a RPC
    // if there is one. Wait! Is there a pg_proc query we can do?
    // We can do it by using the Supabase REST API to read from pg_catalog if exposed,
    // but pg_catalog is usually not exposed via PostgREST.
    // Instead, we can just run a query using a postgres function or check the migration files.
    // Wait! Let's check if we can run a query.
    // Actually, we can write a script that connects via pg (node-postgres) if we have the connection string!
    // Let's check if we have DATABASE_URL or direct connection details in .env.local.
    // No, we only have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
    // But wait! We can create a temporary postgres function via Supabase migration or we can just query the tables.
    
    console.log("Checking if we can run a manual join query via Supabase client...");
    const { data: manualJoin, error: joinErr } = await admin
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        user_id,
        profiles (
          full_name,
          created_at
        )
      `)
      .eq("hotel_id", "80210a67-ce76-4465-9400-f583d6c0a7bf");

    if (joinErr) {
      console.error("Manual Join Error:", joinErr);
    } else {
      console.log("Manual Join Result:", JSON.stringify(manualJoin, null, 2));
    }
}

main().catch(console.error);
