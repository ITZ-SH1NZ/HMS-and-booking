"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { getTopAmenities, groupAmenitiesByCategory } from "@/lib/amenityCatalog";
import { Section } from "./SectionWrapper";

interface AmenitiesSectionProps {
  amenities: string[];
}

export function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (amenities.length === 0) {
    return (
      <Section id="amenities" title="Amenities">
        <p className="text-sm text-slate-400">No amenities listed.</p>
      </Section>
    );
  }

  const topAmenities = getTopAmenities(amenities, 8);
  const grouped = groupAmenitiesByCategory(amenities);
  const hasMore = amenities.length > 8;

  return (
    <Section id="amenities" title="Amenities">
      {/* Quick strip — top 8 amenities */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {topAmenities.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.label}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <Icon className="h-4.5 w-4.5 text-brand-500 shrink-0" />
              <span className="text-slate-700 font-medium">{a.label}</span>
            </div>
          );
        })}
      </div>

      {/* Expandable full list */}
      {hasMore && (
        <>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition mb-4"
          >
            {showAll ? (
              <>
                Show less <ChevronUpIcon className="h-4 w-4" />
              </>
            ) : (
              <>
                Show all {amenities.length} amenities{" "}
                <ChevronDownIcon className="h-4 w-4" />
              </>
            )}
          </button>

          {showAll && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 animate-in fade-in slide-in-from-top-2">
              {grouped.map((group) => (
                <div key={group.category}>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.amenities.map((a) => {
                      const Icon = a.icon;
                      return (
                        <div
                          key={a.label}
                          className="flex items-center gap-2 text-sm text-slate-600"
                        >
                          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
