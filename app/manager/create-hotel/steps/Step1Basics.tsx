"use client";

import RichTextEditor from "../components/RichTextEditor";
import StarRatingInput from "../components/StarRatingInput";
import ChipMultiSelect from "../components/ChipMultiSelect";
import { UsersIcon, HeartIcon, BuildingIcon, CheckIcon } from "@/components/icons";

import { UseHotelDraftReturn } from "../useHotelDraft";
import type { PropertyType } from "@/lib/types";

interface Step1BasicsProps {
  draftContext: UseHotelDraftReturn;
}

const PROPERTY_TYPES = [
  "Hotel",
  "Resort",
  "Villa",
  "Apartment",
  "Homestay",
  "Guest house",
  "Hostel",
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Kannada",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
];

const HIGHLIGHTS = [
  "Beach view",
  "Luxury amenities",
  "Great location",
  "Perfect for families",
  "Mountain view",
  "Infinity pool",
  "Spa & wellness",
  "Free airport shuttle",
  "Pet friendly",
];

const BEST_FOR_OPTIONS = [
  { id: "Families", title: "Families", subtitle: "Family friendly", icon: UsersIcon },
  { id: "Couples", title: "Couples", subtitle: "Romantic getaway", icon: HeartIcon },
  { id: "Business travelers", title: "Business travelers", subtitle: "Work trips", icon: BuildingIcon },
  { id: "Group trips", title: "Group trips", subtitle: "Friends & groups", icon: UsersIcon },
];

export default function Step1Basics({ draftContext }: Step1BasicsProps) {
  const { draft, patch } = draftContext;

  if (!draft) return null;

  const handleBestForToggle = (id: string) => {
    const current = draft.best_for || [];
    if (current.includes(id)) {
      patch({ best_for: current.filter((x: string) => x !== id) });
    } else {
      patch({ best_for: [...current, id] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Basic information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Property Name */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Property name <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              value={draft.name || ""}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Neuron Resort"
              required
            />
          </div>

          {/* Property Type */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Property type <span className="text-brand-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 bg-white"
              value={draft.property_type || ""}
              onChange={(e) => patch({ property_type: e.target.value as PropertyType })}
              required
            >
              <option value="" disabled>Select property type</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Short Description */}
          <div className="flex flex-col md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700">
                Short description <span className="text-brand-500">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {(draft.short_description || "").length}/200
              </span>
            </div>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              value={draft.short_description || ""}
              onChange={(e) => patch({ short_description: e.target.value })}
              placeholder="Describe your property in one or two short sentences..."
              maxLength={200}
              required
            />
          </div>

          {/* Detailed Description */}
          <div className="md:col-span-2">
            <RichTextEditor
              label="Detailed description"
              required
              value={draft.detailed_description || ""}
              onChange={(val) => patch({ detailed_description: val })}
              maxChars={2000}
              placeholder="Provide a detailed description of your property, services, rooms, and special features..."
            />
          </div>

          {/* Star Rating */}
          <div>
            <StarRatingInput
              label="Star rating"
              required
              value={draft.star_rating || 0}
              onChange={(val) => patch({ star_rating: val })}
            />
          </div>

          {/* Year Built */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Year built
            </label>
            <input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              value={draft.year_built || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                patch({ year_built: isNaN(val) ? null : val });
              }}
              placeholder="e.g. 2020"
            />
          </div>

          {/* Languages Spoken */}
          <div className="md:col-span-2">
            <ChipMultiSelect
              label="Languages spoken"
              selected={draft.languages_spoken || []}
              onChange={(val) => patch({ languages_spoken: val })}
              options={LANGUAGES}
              placeholder="Type language..."
            />
          </div>

          {/* Highlights */}
          <div className="md:col-span-2">
            <ChipMultiSelect
              label="Highlights"
              selected={draft.highlights || []}
              onChange={(val) => patch({ highlights: val })}
              options={HIGHLIGHTS}
              placeholder="Type custom highlight..."
            />
          </div>
        </div>
      </div>

      {/* Target Audience Segment Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-1">
          Who is your property best for?
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Select target guest segments for your hotel listing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {BEST_FOR_OPTIONS.map((opt) => {
            const isSelected = (draft.best_for || []).includes(opt.id);
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleBestForToggle(opt.id)}
                className={`relative flex flex-col items-center justify-center p-4 border rounded-2xl text-center transition w-full group ${
                  isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 h-4.5 w-4.5 rounded-full bg-brand-600 border border-brand-600 text-white flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 stroke-[3px]" />
                  </div>
                )}
                <Icon className={`h-8 w-8 mb-2 transition-colors ${
                  isSelected ? "text-brand-700" : "text-slate-400 group-hover:text-slate-500"
                }`} />
                <span className="text-xs font-bold leading-tight">{opt.title}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
