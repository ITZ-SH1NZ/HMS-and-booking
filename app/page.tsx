import Link from "next/link";
import { HotelCard } from "@/components/HotelCard";
import { AirbnbSearch } from "@/components/AirbnbSearch";
import { CategoryStrip } from "@/components/CategoryStrip";
import { WhyChoose } from "@/components/WhyChoose";
import { toHotelCard, getApprovedHotelsCached } from "@/lib/hotels";
import type { HotelCardData } from "@/lib/types";

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

  // Read the catalog from cache (one cached DB query, tag-invalidated on
  // approve/publish), then filter the search term in memory — instant, and
  // avoids a DB round-trip per keystroke/search.
  let hotels: HotelCardData[] = [];
  let error = false;
  try {
    const all = await getApprovedHotelsCached();
    const term = location?.replace(/[,()]/g, " ").trim().toLowerCase();
    const matched = term
      ? all.filter((h) =>
          `${h.name ?? ""} ${h.location ?? ""} ${h.city ?? ""} ${h.state ?? ""}`
            .toLowerCase()
            .includes(term),
        )
      : all;
    hotels = matched.map(toHotelCard);
  } catch {
    error = true;
  }

  return (
    <div className="pb-4">
      {/* Hero */}
      <section className="px-4 pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-slate-900">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/35 to-transparent" />
          <div className="relative px-6 py-16 sm:px-12 sm:py-24">
            <h1 className="max-w-xl text-4xl font-extrabold text-white sm:text-5xl">
              Find your perfect stay
            </h1>
            <p className="mt-3 max-w-md text-lg text-slate-200">
              Book hotels, resorts and apartments worldwide. Best prices
              guaranteed.
            </p>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-8 flex max-w-3xl justify-center px-2">
          <AirbnbSearch />
        </div>
      </section>

      {/* Categories */}
      <CategoryStrip />

      {/* Hotel grid */}
      <section id="hotels" className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {location ? `Hotels in “${location}”` : "Popular hotels"}
          </h2>
          {location ? (
            <span className="text-sm text-slate-500">
              {hotels.length} {hotels.length === 1 ? "result" : "results"}
            </span>
          ) : (
            <Link href="#hotels" className="text-sm font-semibold text-rose-600">
              View all
            </Link>
          )}
        </div>

        {error ? (
          <EmptyState
            title="Couldn't load hotels"
            body="Check that your Supabase keys are set and the schema has been applied."
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

      {/* Why choose HMS */}
      <WhyChoose />
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
