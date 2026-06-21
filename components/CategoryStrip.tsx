"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Palmtree,
  Home,
  Gem,
  Briefcase,
  Leaf,
  Umbrella,
  Wallet,
  ChevronDown,
} from "lucide-react";

const CATEGORIES = [
  { label: "Hotels", Icon: Building2 },
  { label: "Resorts", Icon: Palmtree },
  { label: "Villas", Icon: Home },
  { label: "Luxury", Icon: Gem },
  { label: "Business", Icon: Briefcase },
  { label: "Nature", Icon: Leaf },
  { label: "Beachfront", Icon: Umbrella },
  { label: "Budget", Icon: Wallet },
  { label: "More", Icon: ChevronDown },
];

function CategoryStripInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeType = searchParams.get("type");

  const handleCategoryClick = (label: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Map categories to the database PropertyType options
    const typeMap: Record<string, string> = {
      "Hotels": "Hotel",
      "Resorts": "Resort",
      "Villas": "Villa",
      "Nature": "Homestay",
      "Beachfront": "Apartment",
      "Budget": "Hostel"
    };

    const targetType = typeMap[label];
    if (!targetType) return;

    if (activeType?.toLowerCase() === targetType.toLowerCase()) {
      params.delete("type");
    } else {
      params.set("type", targetType);
    }

    // Retain page hash to anchor to the hotel section
    router.push(`/?${params.toString()}#hotels`);
  };

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none justify-between items-center -mx-4 px-4 lg:mx-0 lg:px-0">
        {CATEGORIES.map((cat) => {
          const Icon = cat.Icon;
          const typeMap: Record<string, string> = {
            "Hotels": "Hotel",
            "Resorts": "Resort",
            "Villas": "Villa",
            "Nature": "Homestay",
            "Beachfront": "Apartment",
            "Budget": "Hostel"
          };
          const catType = typeMap[cat.label];
          const isActive = catType && activeType?.toLowerCase() === catType.toLowerCase();

          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleCategoryClick(cat.label)}
              className={`group hover-target-parent flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-2xl bg-white border transition-all duration-300 cursor-pointer text-center gap-2 select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                isActive
                  ? "border-brand-600 shadow-md ring-1 ring-brand-600"
                  : "border-slate-200/60 shadow-xs hover:border-brand-500 hover:shadow-md"
              }`}
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-full transition duration-200 ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "bg-slate-50 text-brand-600 group-hover:bg-brand-50 group-hover:text-brand-700"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-all duration-300 ${
                    isActive ? "scale-110" : "animate-hover-wiggle-child group-hover:scale-110"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-black transition truncate max-w-[84px] ${
                  isActive ? "text-brand-700 font-extrabold" : "text-slate-700 group-hover:text-slate-900"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CategoryStrip() {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse bg-slate-100 rounded-2xl mx-auto max-w-7xl px-4 py-8" />}>
      <CategoryStripInner />
    </Suspense>
  );
}
