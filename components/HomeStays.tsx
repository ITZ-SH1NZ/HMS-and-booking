"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { HotelCard } from "@/components/HotelCard";
import { FeaturedStaysSection } from "@/components/FeaturedStaysSection";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import type { HotelCardData } from "@/lib/types";

// HotelCardData plus the fields needed for client-side search filtering.
export interface HomeStay extends HotelCardData {
  city: string | null;
  state: string | null;
  property_type: string | null;
}

// The home page's "featured / search results" section. Filtering happens in the
// browser from the full (already-cached) catalog, so the page itself can be
// statically rendered/CDN-cached — the URL's ?location/?type just re-filter
// client-side, keeping the exact same search UX as before.
export function HomeStays({
  allHotels,
  error,
}: {
  allHotels: HomeStay[];
  error: boolean;
}) {
  const params = useSearchParams();
  const location = params.get("location") ?? undefined;
  const type = params.get("type") ?? undefined;

  const hotels = useMemo(() => {
    let matched = allHotels;

    const term = location?.trim().toLowerCase();
    if (term) {
      const words = term.replace(/[,()]/g, " ").split(/\s+/).filter(Boolean);
      matched = matched.filter((h) => {
        const target = `${h.name ?? ""} ${h.location ?? ""} ${h.city ?? ""} ${h.state ?? ""}`.toLowerCase();
        return words.every((word) => target.includes(word));
      });
    }

    if (type) {
      matched = matched.filter(
        (h) => h.property_type?.toLowerCase() === type.toLowerCase(),
      );
    }

    return matched;
  }, [allHotels, location, type]);

  const sortedFeaturedStays = useMemo(
    () =>
      [...hotels]
        .sort((a, b) => {
          const scoreA = (a.rating || 0) * 10 + Math.min(a.reviewCount || 0, 20) * 0.5;
          const scoreB = (b.rating || 0) * 10 + Math.min(b.reviewCount || 0, 20) * 0.5;
          return scoreB - scoreA;
        })
        .slice(0, 10),
    [hotels],
  );

  return (
    <section
      id="hotels"
      className="relative z-10 mx-auto max-w-[1600px] w-full px-6 md:px-10 py-8 scroll-mt-20"
    >
      <ScrollReveal>
        <div className="mb-6 flex items-baseline justify-between border-b border-slate-200/60 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
              {location ? `Stays in “${location}”` : "Featured stays"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 font-bold">
              {location
                ? `Showing available properties in ${location}`
                : "Curated stays we think you'll love"}
            </p>
          </div>
          {location ? (
            <span className="text-sm font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
              {hotels.length} {hotels.length === 1 ? "stay" : "stays"} found
            </span>
          ) : (
            <Link
              href="/hotels"
              className="text-sm font-black text-brand-700 hover:text-brand-600 transition flex items-center gap-1 group"
            >
              View all properties
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </ScrollReveal>

      {error ? (
        <EmptyState
          title="Couldn't load hotels"
          body="Check that your Supabase keys are set and the schema has been applied."
        />
      ) : hotels.length === 0 ? (
        <EmptyState
          title="No hotels found"
          body={
            location
              ? "Try a different search term, or clear the search to view all stays."
              : "Once managers publish and approve hotels, they'll show up here."
          }
        />
      ) : location ? (
        <div className="relative">
          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {hotels.map((hotel) => (
              <StaggerItem key={hotel.id}>
                <HotelCard hotel={hotel} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      ) : (
        <FeaturedStaysSection hotels={sortedFeaturedStays} totalCount={hotels.length} />
      )}
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 px-6 text-center max-w-xl mx-auto w-full my-8 shadow-xs">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500 max-w-sm font-medium">{body}</p>
    </div>
  );
}
