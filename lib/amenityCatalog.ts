// Shared amenity catalog used by both the hotel creation wizard (Step 5)
// and the public listing page (amenity quick-strip + amenities section).
// Keys are the stable string values stored in hotels.amenities[].

import {
  type LucideIcon,
  Wifi,
  Car,
  Snowflake,
  Clock,
  ConciergeBell,
  Shirt,
  Sparkles,
  ArrowUp,
  Luggage,
  AlarmClock,
  Stethoscope,
  Zap,
  Newspaper,
  Cigarette,
  MapPin,
  Waves,
  Dumbbell,
  Flower2,
  Gamepad2,
  Trophy,
  TreePine,
  Mountain,
  Sun,
  Bike,
  Utensils,
  Wine,
  Coffee,
  EggFried,
  CookingPot,
  Flame,
  Baby,
  Droplets,
  Home,
  Presentation,
  Briefcase,
  Printer,
  Building2,
  Accessibility,
  Bath,
  Scan,
  Ear,
  Cctv,
  ShieldCheck,
  FireExtinguisher,
  AlertTriangle,
  Lock,
  Cross,
} from "lucide-react";

export interface AmenityInfo {
  label: string;
  icon: LucideIcon;
  category: AmenityCategory;
}

export type AmenityCategory =
  | "general"
  | "recreation"
  | "dining"
  | "family"
  | "business"
  | "accessibility"
  | "safety";

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, string> = {
  general: "General",
  recreation: "Recreation",
  dining: "Dining",
  family: "Family",
  business: "Business",
  accessibility: "Accessibility",
  safety: "Safety & Security",
};

// The canonical map. Each key matches what's stored in hotels.amenities[].
export const AMENITY_CATALOG: Record<string, AmenityInfo> = {
  // General
  "Free Wi-Fi": { label: "Free Wi-Fi", icon: Wifi, category: "general" },
  "Parking": { label: "Parking", icon: Car, category: "general" },
  "Air conditioning": { label: "Air conditioning", icon: Snowflake, category: "general" },
  "24/7 front desk": { label: "24/7 front desk", icon: Clock, category: "general" },
  "Room service": { label: "Room service", icon: ConciergeBell, category: "general" },
  "Laundry service": { label: "Laundry service", icon: Shirt, category: "general" },
  "Daily housekeeping": { label: "Daily housekeeping", icon: Sparkles, category: "general" },
  "Elevator": { label: "Elevator", icon: ArrowUp, category: "general" },
  "Luggage storage": { label: "Luggage storage", icon: Luggage, category: "general" },
  "Wake-up call": { label: "Wake-up call", icon: AlarmClock, category: "general" },
  "Doctor on call": { label: "Doctor on call", icon: Stethoscope, category: "general" },
  "Power backup": { label: "Power backup", icon: Zap, category: "general" },
  "Newspaper": { label: "Newspaper", icon: Newspaper, category: "general" },
  "Smoking rooms": { label: "Smoking rooms", icon: Cigarette, category: "general" },
  "Designated smoking area": { label: "Designated smoking area", icon: MapPin, category: "general" },

  // Recreation
  "Swimming pool": { label: "Swimming pool", icon: Waves, category: "recreation" },
  "Fitness center / Gym": { label: "Fitness center / Gym", icon: Dumbbell, category: "recreation" },
  "Spa & massage": { label: "Spa & massage", icon: Flower2, category: "recreation" },
  "Indoor games": { label: "Indoor games", icon: Gamepad2, category: "recreation" },
  "Outdoor sports": { label: "Outdoor sports", icon: Trophy, category: "recreation" },
  "Garden": { label: "Garden", icon: TreePine, category: "recreation" },
  "Terrace": { label: "Terrace", icon: Mountain, category: "recreation" },
  "Beachfront": { label: "Beachfront", icon: Sun, category: "recreation" },
  "Cycling": { label: "Cycling", icon: Bike, category: "recreation" },

  // Dining
  "Restaurant": { label: "Restaurant", icon: Utensils, category: "dining" },
  "Bar / Lounge": { label: "Bar / Lounge", icon: Wine, category: "dining" },
  "Coffee shop": { label: "Coffee shop", icon: Coffee, category: "dining" },
  "Breakfast buffet": { label: "Breakfast buffet", icon: EggFried, category: "dining" },
  "Kitchen / Kitchenette": { label: "Kitchen / Kitchenette", icon: CookingPot, category: "dining" },
  "BBQ facilities": { label: "BBQ facilities", icon: Flame, category: "dining" },

  // Family
  "Kids play area": { label: "Kids play area", icon: Gamepad2, category: "family" },
  "Babysitting services": { label: "Babysitting services", icon: Baby, category: "family" },
  "Kids pool": { label: "Kids pool", icon: Droplets, category: "family" },
  "Family rooms": { label: "Family rooms", icon: Home, category: "family" },

  // Business
  "Conference room": { label: "Conference room", icon: Presentation, category: "business" },
  "Business center": { label: "Business center", icon: Briefcase, category: "business" },
  "Fax / Photocopy": { label: "Fax / Photocopy", icon: Printer, category: "business" },
  "Banquet hall": { label: "Banquet hall", icon: Building2, category: "business" },

  // Accessibility
  "Wheelchair accessible": { label: "Wheelchair accessible", icon: Accessibility, category: "accessibility" },
  "Accessible bathroom": { label: "Accessible bathroom", icon: Bath, category: "accessibility" },
  "Elevator with braille": { label: "Elevator with braille", icon: Scan, category: "accessibility" },
  "Auditory guidance": { label: "Auditory guidance", icon: Ear, category: "accessibility" },

  // Safety
  "CCTV security": { label: "CCTV security", icon: Cctv, category: "safety" },
  "24/7 Security guard": { label: "24/7 Security guard", icon: ShieldCheck, category: "safety" },
  "Fire extinguishers": { label: "Fire extinguishers", icon: FireExtinguisher, category: "safety" },
  "Smoke detectors": { label: "Smoke detectors", icon: AlertTriangle, category: "safety" },
  "In-room Safe box": { label: "In-room Safe box", icon: Lock, category: "safety" },
  "First-aid kit": { label: "First-aid kit", icon: Cross, category: "safety" },
};

// Parse amenities safely from various types (array, string, JSON, PG array literal)
export function parseAmenities(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(String).map((s) => s.trim()).filter(Boolean);
        }
      } catch {}
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Get top N amenities for the quick-strip display.
export function getTopAmenities(amenityKeys: unknown, max: number = 7): AmenityInfo[] {
  const keys = parseAmenities(amenityKeys);
  return keys
    .map((key) => AMENITY_CATALOG[key])
    .filter((a): a is AmenityInfo => !!a)
    .slice(0, max);
}

// Group amenities by category for the full amenities section.
export function groupAmenitiesByCategory(
  amenityKeys: unknown
): { category: AmenityCategory; label: string; amenities: AmenityInfo[] }[] {
  const keys = parseAmenities(amenityKeys);
  const grouped = new Map<AmenityCategory, AmenityInfo[]>();

  for (const key of keys) {
    const info = AMENITY_CATALOG[key];
    if (!info) continue;
    const list = grouped.get(info.category) ?? [];
    list.push(info);
    grouped.set(info.category, list);
  }

  // Return in display order, only categories that have at least one amenity
  const order: AmenityCategory[] = [
    "general",
    "recreation",
    "dining",
    "family",
    "business",
    "accessibility",
    "safety",
  ];

  return order
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      category: cat,
      label: AMENITY_CATEGORY_LABELS[cat],
      amenities: grouped.get(cat)!,
    }));
}
