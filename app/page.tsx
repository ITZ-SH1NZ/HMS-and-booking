import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HotelCard } from "@/components/HotelCard";
import { SearchForm } from "@/components/SearchForm";
import { toHotelCard } from "@/lib/hotels";
import type { HotelWithStats } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { location } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("hotels")
    .select("*, rooms(price), reviews(rating)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  const { data, error } = await query;
  const hotels = ((data as HotelWithStats[] | null) ?? []).map(toHotelCard);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h1 className="max-w-2xl text-4xl font-extrabold text-white sm:text-5xl">
            Find your next stay
          </h1>
          <p className="max-w-xl text-lg text-slate-200">
            Search hotels around the world, compare prices, and book your perfect
            room.
          </p>
          <Suspense fallback={<div className="h-28 w-full max-w-4xl" />}>
            <SearchForm />
          </Suspense>
        </div>
      </section>

      {/* Hotel grid */}
      <section id="hotels" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {location ? `Hotels in “${location}”` : "Explore hotels"}
          </h2>
          <span className="text-sm text-slate-500">
            {hotels.length} {hotels.length === 1 ? "result" : "results"}
          </span>
        </div>

        {error ? (
          <EmptyState
            title="Couldn't load hotels"
            body="Check that your Supabase keys are set in .env.local and the schema has been applied."
          />
        ) : hotels.length === 0 ? (
          <EmptyState
            title="No hotels yet"
            body={
              location
                ? "Try a different location, or clear your search."
                : "Once managers create and get approved for hotels, they'll show up here."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>
    </div>
  );
}
