import Link from "next/link";
import {
  Palmtree,
  Home,
  Umbrella,
  Waves,
  Flower2,
  PawPrint,
  Building2,
  Tent,
  LayoutGrid,
} from "lucide-react";

// Curated collections that deep-link into the Explore page with a REAL filter
// applied (property_type / amenity / pets_policy) — so every tile leads to an
// actual, filtered result set rather than a decorative dead-end.
const COLLECTIONS = [
  { label: "Resorts", Icon: Palmtree, href: "/hotels?type=Resort" },
  { label: "Villas", Icon: Home, href: "/hotels?type=Villa" },
  { label: "Beachfront", Icon: Umbrella, href: "/hotels?amenity=Sea+View" },
  { label: "With a pool", Icon: Waves, href: "/hotels?amenity=Swimming+Pool" },
  { label: "Spa stays", Icon: Flower2, href: "/hotels?amenity=Spa" },
  { label: "Pet-friendly", Icon: PawPrint, href: "/hotels?pets=allowed" },
  { label: "Apartments", Icon: Building2, href: "/hotels?type=Apartment" },
  { label: "Homestays", Icon: Tent, href: "/hotels?type=Homestay" },
  { label: "View all", Icon: LayoutGrid, href: "/hotels" },
];

export function CategoryStrip() {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Find your kind of stay</h2>
        <p className="mt-1 text-sm text-slate-500">
          Jump straight to a curated collection of handpicked stays.
        </p>
      </div>

      {/* Mobile: horizontal snap-scroll. Desktop (lg): evenly-spread grid. */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-9 lg:gap-3 lg:overflow-visible">
        {COLLECTIONS.map((cat) => {
          const Icon = cat.Icon;
          return (
            <Link
              key={cat.label}
              href={cat.href}
              className="group flex flex-col items-center justify-center shrink-0 snap-start w-24 lg:w-auto h-24 rounded-2xl bg-white border border-slate-200/60 shadow-xs transition-all duration-300 text-center gap-2 select-none active:scale-95 hover:border-brand-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-brand-600 transition duration-200 group-hover:bg-brand-50 group-hover:text-brand-700">
                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="text-xs font-black text-slate-700 transition group-hover:text-slate-900 truncate max-w-[84px]">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
