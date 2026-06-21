import { createClient } from "@/lib/supabase/client";
import type {
  Hotel,
  HotelDraft,
  Room,
  RoomDraft,
  HotelPhoto,
  RoomPhoto,
  PricingSeason,
  AdditionalCharge,
  AvailabilityRule,
  BlockedDate,
} from "@/lib/types";
import DOMPurify from "isomorphic-dompurify";

const supabase = createClient();

// Helper to sanitize HTML fields
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "u", "ul", "ol", "li", "a", "strong", "em", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// Parses raw PostgreSQL array representation e.g. "{\"A\",\"B\"}" or "{A,B}" to string[]
export function parsePostgresArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    const clean = val.trim();
    if (clean.startsWith("{") && clean.endsWith("}")) {
      const content = clean.slice(1, -1).trim();
      if (!content) return [];
      
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      let escaped = false;
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (escaped) {
          current += char;
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      
      return result
        .map(x => x.replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    }
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {}
  }
  return [];
}

// Normalizes array fields returned from PostgREST/Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeHotelDraft(hotel: any): HotelDraft {
  if (!hotel) return hotel;
  
  const rawAmenities = parsePostgresArray(hotel.amenities);
  const rawLanguages = parsePostgresArray(hotel.languages_spoken);
  const rawHighlights = parsePostgresArray(hotel.highlights);
  const rawBestFor = parsePostgresArray(hotel.best_for);

  const cleanArrayField = (arr: string[]): string[] => {
    return arr.filter(x => {
      if (!x) return false;
      const s = x.trim();
      if (s.length <= 1) return false;
      if (s === '{"' || s === '"}' || s === '\\"' || s.includes('{') || s.includes('}') || s.includes('"') || s.includes('\\')) {
        return false;
      }
      return true;
    });
  };

  return {
    ...hotel,
    amenities: cleanArrayField(rawAmenities),
    languages_spoken: cleanArrayField(rawLanguages),
    highlights: cleanArrayField(rawHighlights),
    best_for: cleanArrayField(rawBestFor),
  };
}

/**
 * 1. Get or create the most recent draft hotel for a manager.
 * Never creates duplicate drafts.
 */
export async function getOrCreateDraft(managerId: string): Promise<HotelDraft> {
  const { data: existing } = await supabase
    .from("hotels")
    .select("*")
    .eq("manager_id", managerId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return normalizeHotelDraft(existing[0]);
  }

  // Create a new skeleton draft row
  const { data: newlyCreated, error: createError } = await supabase
    .from("hotels")
    .insert({
      manager_id: managerId,
      name: "Untitled Property",
      location: "Pending Location",
      status: "draft",
      wizard_step: 1,
    })
    .select()
    .single();

  if (createError || !newlyCreated) {
    throw new Error(createError?.message || "Failed to create draft hotel");
  }

  return normalizeHotelDraft(newlyCreated);
}

/**
 * 2. Save active wizard step details.
 * Sanitizes HTML fields and updates step index.
 */
export async function saveStep(
  hotelId: string,
  step: number,
  patch: Partial<Hotel>
): Promise<HotelDraft> {
  // Read current draft to verify step progression
  const { data: current } = await supabase
    .from("hotels")
    .select("wizard_step")
    .eq("id", hotelId)
    .single();

  const currentStep = current?.wizard_step || 1;
  const nextStep = Math.max(currentStep, step);

  const cleanPatch = { ...patch };
  if (cleanPatch.detailed_description) {
    cleanPatch.detailed_description = sanitizeHTML(cleanPatch.detailed_description);
  }

  const { data: updated, error } = await supabase
    .from("hotels")
    .update({
      ...cleanPatch,
      wizard_step: nextStep,
    })
    .eq("id", hotelId)
    .select()
    .single();

  if (error || !updated) {
    throw new Error(error?.message || "Failed to save wizard step");
  }

  return normalizeHotelDraft(updated);
}

/**
 * 3. Sub-resources CRUD operations
 */

// 3.1 Rooms
export async function getRooms(hotelId: string): Promise<RoomDraft[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as RoomDraft[]) || [];
}

export async function upsertRoom(room: Partial<Room> & { hotel_id: string }): Promise<RoomDraft> {
  const adults = room.adults ?? 2;
  const children = room.children ?? 0;
  const price = room.price ?? 0;
  const totalUnits = room.total_units ?? 1;

  const payload = {
    ...room,
    capacity: adults + children,
    price: price,
    total_units: totalUnits,
  };

  const { data, error } = await supabase
    .from("rooms")
    .upsert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to upsert room");
  }

  return data as RoomDraft;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function reorderRooms(rooms: { id: string; sort_order: number }[]): Promise<void> {
  const updates = rooms.map((r) =>
    supabase.from("rooms").update({ sort_order: r.sort_order }).eq("id", r.id)
  );
  await Promise.all(updates);
}

// 3.2 Hotel Photos
export async function getHotelPhotos(hotelId: string): Promise<HotelPhoto[]> {
  const { data, error } = await supabase
    .from("hotel_photos")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function insertHotelPhoto(
  hotelId: string,
  url: string,
  category: string,
  sortOrder: number = 0
): Promise<HotelPhoto> {
  const { data, error } = await supabase
    .from("hotel_photos")
    .insert({
      hotel_id: hotelId,
      url,
      category,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error || !data) throw error;
  return data;
}

export async function deleteHotelPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from("hotel_photos").delete().eq("id", photoId);
  if (error) throw error;
}

// 3.3 Room Photos
export async function getRoomPhotos(roomId: string): Promise<RoomPhoto[]> {
  const { data, error } = await supabase
    .from("room_photos")
    .select("*")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function insertRoomPhoto(
  roomId: string,
  url: string,
  sortOrder: number = 0
): Promise<RoomPhoto> {
  const { data, error } = await supabase
    .from("room_photos")
    .insert({
      room_id: roomId,
      url,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error || !data) throw error;
  return data;
}

export async function deleteRoomPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from("room_photos").delete().eq("id", photoId);
  if (error) throw error;
}

// 3.4 Pricing Seasons
export async function getPricingSeasons(hotelId: string): Promise<PricingSeason[]> {
  const { data, error } = await supabase
    .from("pricing_seasons")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertPricingSeason(season: Partial<PricingSeason> & { hotel_id: string }): Promise<PricingSeason> {
  const { data, error } = await supabase
    .from("pricing_seasons")
    .upsert(season)
    .select()
    .single();

  if (error || !data) throw error;
  return data;
}

export async function deletePricingSeason(seasonId: string): Promise<void> {
  const { error } = await supabase.from("pricing_seasons").delete().eq("id", seasonId);
  if (error) throw error;
}

// 3.5 Additional Charges
export async function getAdditionalCharges(hotelId: string): Promise<AdditionalCharge[]> {
  const { data, error } = await supabase
    .from("additional_charges")
    .select("*")
    .eq("hotel_id", hotelId);

  if (error) throw error;
  return data || [];
}

export async function upsertAdditionalCharge(charge: Partial<AdditionalCharge> & { hotel_id: string }): Promise<AdditionalCharge> {
  const { data, error } = await supabase
    .from("additional_charges")
    .upsert(charge)
    .select()
    .single();

  if (error || !data) throw error;
  return data;
}

export async function deleteAdditionalCharge(chargeId: string): Promise<void> {
  const { error } = await supabase.from("additional_charges").delete().eq("id", chargeId);
  if (error) throw error;
}

// 3.6 Availability Rules
export async function getAvailabilityRule(hotelId: string): Promise<AvailabilityRule | null> {
  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("hotel_id", hotelId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertAvailabilityRule(rule: Partial<AvailabilityRule> & { hotel_id: string }): Promise<AvailabilityRule> {
  const { data, error } = await supabase
    .from("availability_rules")
    .upsert(rule, { onConflict: "hotel_id" })
    .select()
    .single();

  if (error || !data) throw error;
  return data;
}

// 3.7 Blocked Dates
export async function getBlockedDates(hotelId: string): Promise<BlockedDate[]> {
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function toggleBlockedDate(hotelId: string, date: string, reason?: string): Promise<void> {
  const { data: existing } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("hotel_id", hotelId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("blocked_dates")
      .insert({
        hotel_id: hotelId,
        date,
        reason: reason || "Blocked by manager",
      });
    if (error) throw error;
  }
}

export async function blockDateRange(
  hotelId: string,
  startDateStr: string,
  endDateStr: string,
  reason?: string
): Promise<void> {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error("Invalid date range");
  }

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(
        current.getDate()
      ).padStart(2, "0")}`
    );
    current.setDate(current.getDate() + 1);
  }

  // Find existing blocked dates in this range to prevent duplicates
  const { data: existing } = await supabase
    .from("blocked_dates")
    .select("date")
    .eq("hotel_id", hotelId)
    .in("date", dates);

  const existingSet = new Set((existing || []).map((r) => r.date));
  const toInsert = dates
    .filter((d) => !existingSet.has(d))
    .map((d) => ({
      hotel_id: hotelId,
      date: d,
      reason: reason || "Blocked by manager",
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("blocked_dates").insert(toInsert);
    if (error) throw error;
  }
}

export async function unblockDateRange(
  hotelId: string,
  startDateStr: string,
  endDateStr: string
): Promise<void> {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error("Invalid date range");
  }

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(
        current.getDate()
      ).padStart(2, "0")}`
    );
    current.setDate(current.getDate() + 1);
  }

  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("hotel_id", hotelId)
    .in("date", dates);

  if (error) throw error;
}

/**
 * 4. Publish Draft.
 * Performs rigorous validations across all components, syncs legacy fields,
 * sets status to pending, and saves.
 */
export async function publishDraft(hotelId: string): Promise<HotelDraft> {
  // Fetch everything to do validation
  const { data: hotel, error: hotelError } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", hotelId)
    .single();

  if (hotelError || !hotel) {
    throw new Error(hotelError?.message || "Hotel not found");
  }

  const rooms = await getRooms(hotelId);
  const photos = await getHotelPhotos(hotelId);

  // 1. Validations
  // Step 1 basics
  if (!hotel.name || hotel.name === "Untitled Property") throw new Error("Property name is required.");
  if (!hotel.property_type) throw new Error("Property type is required.");
  if (!hotel.short_description) throw new Error("Short description is required.");
  if (!hotel.detailed_description) throw new Error("Detailed description is required.");
  if (!hotel.star_rating) throw new Error("Star rating is required.");

  // Step 2 location
  if (!hotel.country || !hotel.state || !hotel.city || !hotel.address_line || !hotel.pincode) {
    throw new Error("Complete location address is required.");
  }
  if (hotel.latitude === null || hotel.longitude === null) {
    throw new Error("Coordinates must be selected on the map.");
  }

  // Step 3 photos
  const coverPhoto = photos.find((p) => p.category === "cover");
  if (!coverPhoto) throw new Error("A cover photo is required.");
  const roomPhotosCount = photos.filter((p) => p.category === "rooms").length;
  // Either >=1 hotel rooms category photo OR >=1 photo attached to room types
  const roomTypes = rooms.filter((r) => r.is_active);
  if (roomTypes.length === 0) {
    throw new Error("At least one active room is required.");
  }

  // Check if at least one room has photos or if there are general room photos
  let hasRoomPhotos = roomPhotosCount > 0;
  if (!hasRoomPhotos) {
    for (const r of roomTypes) {
      const rp = await getRoomPhotos(r.id);
      if (rp.length > 0) {
        hasRoomPhotos = true;
        break;
      }
    }
  }
  if (!hasRoomPhotos) {
    throw new Error("At least one room photo is required.");
  }

  // Step 4 rooms check
  for (const r of roomTypes) {
    if (!r.price || r.price <= 0) {
      throw new Error(`Room '${r.name}' must have a valid price greater than 0.`);
    }
    if (!r.total_units || r.total_units < 1) {
      throw new Error(`Room '${r.name}' must have at least 1 unit.`);
    }
  }

  // Step 6 policies
  if (!hotel.check_in_time || !hotel.check_out_time) {
    throw new Error("Check-in and Check-out times are required.");
  }
  if (!hotel.cancellation_policy) throw new Error("Cancellation policy is required.");
  if (!hotel.payment_policy) throw new Error("Payment policy is required.");
  if (hotel.require_advance && (!hotel.advance_amount || hotel.advance_amount <= 0)) {
    throw new Error("Advance payment amount is required when advance payment is enabled.");
  }

  // Compiling legacy syncs
  const computedLocation = `${hotel.city}, ${hotel.state}, ${hotel.country}`;
  const coverUrl = coverPhoto.url;

  // Publish
  const { data: publishedHotel, error: publishError } = await supabase
    .from("hotels")
    .update({
      status: "pending",
      location: computedLocation,
      image_url: coverUrl,
      terms_accepted: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", hotelId)
    .select()
    .single();

  if (publishError || !publishedHotel) {
    throw new Error(publishError?.message || "Failed to publish listing.");
  }

  return normalizeHotelDraft(publishedHotel);
}
