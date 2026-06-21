import DOMPurify from "isomorphic-dompurify";
import {
  ClockIcon,
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  UsersIcon,
  BanIcon,
  ShieldIcon,
} from "@/components/icons";
import type { Hotel, AvailabilityRule } from "@/lib/types";
import { Section } from "./SectionWrapper";

interface OverviewSectionProps {
  hotel: Hotel;
  availabilityRule: AvailabilityRule | null;
}

// Friendly display for policy enum values
function policyText(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const map: Record<string, string> = {
    allowed: "Allowed",
    not_allowed: "Not allowed",
    on_request: "On request",
    designated: "In designated areas",
  };
  return map[value] || value;
}

function cancellationText(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const map: Record<string, string> = {
    flexible: "Flexible",
    moderate: "Moderate",
    strict: "Strict",
    custom: "Custom",
  };
  return map[value] || value;
}

export function OverviewSection({ hotel, availabilityRule }: OverviewSectionProps) {
  // Defense-in-depth: sanitize even though saveStep already sanitizes at write-time.
  // Covers legacy rows or non-wizard writes.
  const description =
    hotel.detailed_description || hotel.short_description || hotel.description || "";
  const sanitizedHtml = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ["b", "i", "u", "ul", "ol", "li", "a", "strong", "em", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  const minStay =
    availabilityRule?.min_stay_weekday && availabilityRule.min_stay_weekday > 1
      ? `${availabilityRule.min_stay_weekday} night${availabilityRule.min_stay_weekday === 1 ? "" : "s"}`
      : "1 night";

  const details = [
    {
      icon: <ClockIcon className="h-4 w-4" />,
      label: "Check-in",
      value: hotel.check_in_time || "Not specified",
    },
    {
      icon: <ClockIcon className="h-4 w-4" />,
      label: "Check-out",
      value: hotel.check_out_time || "Not specified",
    },
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      label: "Minimum stay",
      value: minStay,
    },
    {
      icon: <BuildingIcon className="h-4 w-4" />,
      label: "Property type",
      value: hotel.property_type || "Not specified",
    },
    ...(hotel.year_built
      ? [{ icon: <CalendarIcon className="h-4 w-4" />, label: "Year built", value: String(hotel.year_built) }]
      : []),
    ...(hotel.languages_spoken && hotel.languages_spoken.length > 0
      ? [
          {
            icon: <GlobeIcon className="h-4 w-4" />,
            label: "Languages spoken",
            value: hotel.languages_spoken.join(", "),
          },
        ]
      : []),
    {
      icon: <ShieldIcon className="h-4 w-4" />,
      label: "Cancellation policy",
      value: cancellationText(hotel.cancellation_policy),
    },
    {
      icon: <UsersIcon className="h-4 w-4" />,
      label: "Best for",
      value:
        hotel.best_for && hotel.best_for.length > 0
          ? hotel.best_for.join(", ")
          : "Everyone",
    },
    {
      icon: <BanIcon className="h-4 w-4" />,
      label: "Pets",
      value: policyText(hotel.pets_policy),
    },
    {
      icon: <BanIcon className="h-4 w-4" />,
      label: "Smoking",
      value: policyText(hotel.smoking_policy),
    },
    {
      icon: <BanIcon className="h-4 w-4" />,
      label: "Events & parties",
      value: policyText(hotel.parties_policy),
    },
  ];

  return (
    <Section id="overview">
      {/* Description */}
      {sanitizedHtml && (
        <div className="mb-6">
          <div
            className="prose prose-sm max-w-none text-slate-700 leading-relaxed prose-a:text-rose-600"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        {details.map((d) => (
          <div key={d.label} className="flex items-start gap-3">
            <span className="mt-0.5 text-slate-400 shrink-0">{d.icon}</span>
            <div>
              <p className="text-xs font-medium text-slate-500">{d.label}</p>
              <p className="text-sm font-semibold text-slate-800">{d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
