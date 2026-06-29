"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getHotelById,
  saveStep,
  getRooms,
  upsertRoom,
  deleteRoom as apiDeleteRoom,
  reorderRooms as apiReorderRooms,
  getHotelPhotos,
  insertHotelPhoto,
  deleteHotelPhoto as apiDeleteHotelPhoto,
  getPricingSeasons,
  upsertPricingSeason,
  deletePricingSeason as apiDeletePricingSeason,
  getAdditionalCharges,
  upsertAdditionalCharge,
  deleteAdditionalCharge as apiDeleteAdditionalCharge,
  getAvailabilityRule,
  upsertAvailabilityRule,
  getBlockedDates,
  toggleBlockedDate as apiToggleBlockedDate,
  blockDateRange as apiBlockDateRange,
  unblockDateRange as apiUnblockDateRange,
} from "@/lib/hotelDraft";
import type {
  HotelDraft,
  RoomDraft,
  HotelPhoto,
  PricingSeason,
  AdditionalCharge,
  AvailabilityRule,
  BlockedDate,
} from "@/lib/types";

const supabase = createClient();

/**
 * Same shape and behaviour as useHotelDraft (see app/manager/create-hotel),
 * but for editing one specific, already-existing hotel by id - including
 * hotels that are already approved/published, not just in-progress drafts.
 * This lets the existing Step1Basics / Step4Rooms / Step7Pricing components
 * be reused here unchanged, since they only depend on this hook's shape.
 */
export function useHotelEditor(hotelId: string) {
  const [draft, setDraft] = useState<HotelDraft | null>(null);
  const [rooms, setRooms] = useState<RoomDraft[]>([]);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [seasons, setSeasons] = useState<PricingSeason[]>([]);
  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [rule, setRule] = useState<AvailabilityRule | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const accumulatedPatchRef = useRef<Partial<HotelDraft>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ruleRef = useRef<AvailabilityRule | null>(null);
  const blockedRef = useRef<BlockedDate[]>([]);

  const loadDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const hotel = await getHotelById(hotelId);
      if (!hotel) throw new Error("Hotel not found.");
      if (hotel.manager_id !== user.id) {
        throw new Error("You don't have permission to edit this hotel.");
      }
      setDraft(hotel);

      const [
        loadedRooms,
        loadedPhotos,
        loadedSeasons,
        loadedCharges,
        loadedRule,
        loadedBlocked,
      ] = await Promise.all([
        getRooms(hotel.id),
        getHotelPhotos(hotel.id),
        getPricingSeasons(hotel.id),
        getAdditionalCharges(hotel.id),
        getAvailabilityRule(hotel.id),
        getBlockedDates(hotel.id),
      ]);

      setRooms(loadedRooms);
      setPhotos(loadedPhotos);
      setSeasons(loadedSeasons);
      setCharges(loadedCharges);
      setRule(loadedRule);
      ruleRef.current = loadedRule;
      setBlockedDates(loadedBlocked);
      blockedRef.current = loadedBlocked;
    } catch (err) {
      console.error("Error loading hotel", err);
      setError(err instanceof Error ? err.message : "Failed to load hotel");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDraft();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDraft]);

  const flush = useCallback(async () => {
    if (!draft || Object.keys(accumulatedPatchRef.current).length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSaving(true);
    const patch = { ...accumulatedPatchRef.current };
    accumulatedPatchRef.current = {};

    try {
      // Pass the hotel's *current* wizard_step (already 9 for published
      // hotels) so saveStep's progression logic is a harmless no-op here -
      // we only care about it persisting the field patch.
      const updated = await saveStep(draft.id, draft.wizard_step || 9, patch);
      setDraft(updated);
    } catch (err) {
      console.error("Autosave failed", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
      accumulatedPatchRef.current = { ...patch, ...accumulatedPatchRef.current };
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const patch = useCallback(
    (updates: Partial<HotelDraft>) => {
      if (!draft) return;

      setDraft((prev) => (prev ? { ...prev, ...updates } : null));
      accumulatedPatchRef.current = { ...accumulatedPatchRef.current, ...updates };

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(async () => {
        await flush();
      }, 800);
    },
    [draft, flush],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Not used in the standalone editor (no multi-step wizard navigation
  // here), kept only so this hook's return shape matches useHotelDraft's,
  // which the shared step components are typed against.
  const navigateToStep = useCallback(
    async (_step: number, updates: Partial<HotelDraft> = {}) => {
      if (Object.keys(updates).length) patch(updates);
      await flush();
    },
    [patch, flush],
  );

  const saveRoom = async (roomData: Partial<RoomDraft>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertRoom({ ...roomData, hotel_id: draft.id });
      setRooms(await getRooms(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room details.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeRoom = async (roomId: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiDeleteRoom(roomId);
      setRooms(await getRooms(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete room.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const reorderRoomsList = async (roomsToReorder: { id: string; sort_order: number }[]) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiReorderRooms(roomsToReorder);
      setRooms(await getRooms(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder rooms.");
    } finally {
      setSaving(false);
    }
  };

  const addPhoto = async (url: string, category: string, sortOrder: number = 0) => {
    if (!draft) return;
    setSaving(true);
    try {
      await insertHotelPhoto(draft.id, url, category, sortOrder);
      setPhotos(await getHotelPhotos(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add photo.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiDeleteHotelPhoto(photoId);
      setPhotos(await getHotelPhotos(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo.");
    } finally {
      setSaving(false);
    }
  };

  const saveSeason = async (seasonData: Partial<PricingSeason>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertPricingSeason({ ...seasonData, hotel_id: draft.id });
      setSeasons(await getPricingSeasons(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save seasonal price.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeSeason = async (seasonId: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiDeletePricingSeason(seasonId);
      setSeasons(await getPricingSeasons(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete season.");
    } finally {
      setSaving(false);
    }
  };

  const saveCharge = async (chargeData: Partial<AdditionalCharge>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertAdditionalCharge({ ...chargeData, hotel_id: draft.id });
      setCharges(await getAdditionalCharges(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save additional charge.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeCharge = async (chargeId: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiDeleteAdditionalCharge(chargeId);
      setCharges(await getAdditionalCharges(draft.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete additional charge.");
    } finally {
      setSaving(false);
    }
  };

  const saveAvailabilityRule = async (ruleData: Partial<AvailabilityRule>) => {
    if (!draft) return;
    const base = ruleRef.current;
    const merged: AvailabilityRule = {
      id: base?.id ?? "",
      created_at: base?.created_at ?? "",
      hotel_id: draft.id,
      open_for_booking: base?.open_for_booking ?? true,
      advance_days: base?.advance_days ?? 365,
      min_stay_weekday: base?.min_stay_weekday ?? 1,
      min_stay_weekend: base?.min_stay_weekend ?? 1,
      max_stay: base?.max_stay ?? null,
      ...ruleData,
    };
    ruleRef.current = merged;
    setRule(merged);
    try {
      const { id: _id, created_at: _ca, ...payload } = merged;
      const saved = await upsertAvailabilityRule(payload);
      if (!ruleRef.current.id) {
        ruleRef.current = { ...ruleRef.current, id: saved.id, created_at: saved.created_at };
        setRule((r) => (r ? { ...r, id: saved.id, created_at: saved.created_at } : r));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save availability rules.");
    }
  };

  const toggleBlocked = async (date: string, reason?: string) => {
    if (!draft) return;
    const current = blockedRef.current;
    const exists = current.some((b) => b.date === date);
    const next = exists
      ? current.filter((b) => b.date !== date)
      : [
          ...current,
          {
            id: `temp-${date}`,
            hotel_id: draft.id,
            date,
            reason: reason ?? null,
            created_at: new Date().toISOString(),
          } as BlockedDate,
        ];
    blockedRef.current = next;
    setBlockedDates(next);
    try {
      await apiToggleBlockedDate(draft.id, date, reason);
    } catch (err) {
      blockedRef.current = current;
      setBlockedDates(current);
      setError(err instanceof Error ? err.message : "Failed to toggle date blocking.");
    }
  };

  const blockRange = async (startDate: string, endDate: string, reason?: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiBlockDateRange(draft.id, startDate, endDate, reason);
      const updated = await getBlockedDates(draft.id);
      setBlockedDates(updated);
      blockedRef.current = updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block date range.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const unblockRange = async (startDate: string, endDate: string) => {
    if (!draft) return;
    setSaving(true);
    try {
      await apiUnblockDateRange(draft.id, startDate, endDate);
      const updated = await getBlockedDates(draft.id);
      setBlockedDates(updated);
      blockedRef.current = updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock date range.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    draft,
    rooms,
    photos,
    seasons,
    charges,
    rule,
    blockedDates,
    loading,
    saving,
    isNavigating,
    error,
    setError,
    patch,
    flush,
    navigateToStep,
    saveRoom,
    removeRoom,
    reorderRoomsList,
    addPhoto,
    removePhoto,
    saveSeason,
    removeSeason,
    saveCharge,
    removeCharge,
    saveAvailabilityRule,
    toggleBlocked,
    blockRange,
    unblockRange,
    reload: loadDraft,
  };
}

export type UseHotelEditorReturn = ReturnType<typeof useHotelEditor>;