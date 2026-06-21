"use client";

import { useScrollspy } from "./useScrollspy";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms & rates" },
  { id: "amenities", label: "Amenities" },
  { id: "photos", label: "Photos" },
  { id: "location", label: "Location" },
  { id: "policies", label: "Policies" },
  { id: "reviews", label: "Reviews" },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

export function SectionTabs() {
  const activeId = useScrollspy(SECTION_IDS);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200"
      aria-label="Page sections"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex gap-0 overflow-x-auto scrollbar-thin">
          {SECTIONS.map((section) => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleClick(section.id)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
