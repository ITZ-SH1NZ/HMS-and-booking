"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateDraft,
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

export function useHotelDraft(hotelId?: string) {
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

  // Refs for tracking accumulated patch changes and debounce timer
  const accumulatedPatchRef = useRef<Partial<HotelDraft>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live mirrors of state that rapid, optimistic actions read/write so that
  // back-to-back clicks accumulate correctly instead of racing on a stale
  // render closure.
  const ruleRef = useRef<AvailabilityRule | null>(null);
  const blockedRef = useRef<BlockedDate[]>([]);

  // Load or create draft hotel on mount
  const loadDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const hotelDraft = await getOrCreateDraft(user.id, hotelId);
      setDraft(hotelDraft);

      // Load all sub-resources in parallel
      const [
        loadedRooms,
        loadedPhotos,
        loadedSeasons,
        loadedCharges,
        loadedRule,
        loadedBlocked,
      ] = await Promise.all([
        getRooms(hotelDraft.id),
        getHotelPhotos(hotelDraft.id),
        getPricingSeasons(hotelDraft.id),
        getAdditionalCharges(hotelDraft.id),
        getAvailabilityRule(hotelDraft.id),
        getBlockedDates(hotelDraft.id),
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
      console.error("Error loading draft", err);
      setError(err instanceof Error ? err.message : "Failed to load hotel draft");
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

  // Flush any pending updates immediately to the database
  const flush = useCallback(async () => {
    if (!draft || Object.keys(accumulatedPatchRef.current).length === 0) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSaving(true);
    const patch = { ...accumulatedPatchRef.current };
    accumulatedPatchRef.current = {};

    try {
      const updated = await saveStep(draft.id, draft.wizard_step || 1, patch);
      setDraft(updated);
    } catch (err) {
      console.error("Autosave failed", err);
      setError(err instanceof Error ? err.message : "Failed to auto-save changes");
      // Put failed changes back to try again later
      accumulatedPatchRef.current = { ...patch, ...accumulatedPatchRef.current };
    } finally {
      setSaving(false);
    }
  }, [draft]);

  // Debounced patch function for inputs
  const patch = useCallback(
    (updates: Partial<HotelDraft>) => {
      if (!draft) return;

      // Update local state immediately for snappy inputs
      setDraft((prev) => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });

      // Accumulate changes
      accumulatedPatchRef.current = {
        ...accumulatedPatchRef.current,
        ...updates,
      };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        await flush();
      }, 800);
    },
    [draft, flush]
  );

  // Clean up debounce on unmount by flushing
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update step and immediately save
  const navigateToStep = useCallback(
    async (step: number, updates: Partial<HotelDraft> = {}) => {
      if (!draft) return;

      setIsNavigating(true);
      // Flush any pending text inputs first
      await flush();

      try {
        const updated = await saveStep(draft.id, step, updates);
        setDraft(updated);
      } catch (err) {
        console.error("Failed to update wizard step", err);
        setError(err instanceof Error ? err.message : "Failed to update step progress");
      } finally {
        setIsNavigating(false);
      }
    },
    [draft, flush]
  );

  // Helper actions for sub-resources

  // Rooms
  const saveRoom = async (roomData: Partial<RoomDraft>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertRoom({ ...roomData, hotel_id: draft.id });
      const updatedRooms = await getRooms(draft.id);
      setRooms(updatedRooms);
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
      const updatedRooms = await getRooms(draft.id);
      setRooms(updatedRooms);
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
      const updatedRooms = await getRooms(draft.id);
      setRooms(updatedRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder rooms.");
    } finally {
      setSaving(false);
    }
  };

  // Photos
  const addPhoto = async (url: string, category: string, sortOrder: number = 0) => {
    if (!draft) return;
    setSaving(true);
    try {
      await insertHotelPhoto(draft.id, url, category, sortOrder);
      const updatedPhotos = await getHotelPhotos(draft.id);
      setPhotos(updatedPhotos);
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
      const updatedPhotos = await getHotelPhotos(draft.id);
      setPhotos(updatedPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo.");
    } finally {
      setSaving(false);
    }
  };

  // Pricing Seasons
  const saveSeason = async (seasonData: Partial<PricingSeason>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertPricingSeason({ ...seasonData, hotel_id: draft.id });
      const updatedSeasons = await getPricingSeasons(draft.id);
      setSeasons(updatedSeasons);
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
      const updatedSeasons = await getPricingSeasons(draft.id);
      setSeasons(updatedSeasons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete season.");
    } finally {
      setSaving(false);
    }
  };

  // Additional Charges
  const saveCharge = async (chargeData: Partial<AdditionalCharge>) => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsertAdditionalCharge({ ...chargeData, hotel_id: draft.id });
      const updatedCharges = await getAdditionalCharges(draft.id);
      setCharges(updatedCharges);
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
      const updatedCharges = await getAdditionalCharges(draft.id);
      setCharges(updatedCharges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete additional charge.");
    } finally {
      setSaving(false);
    }
  };

  // Availability Rules
  const saveAvailabilityRule = async (ruleData: Partial<AvailabilityRule>) => {
    if (!draft) return;
    // Merge the patch onto the LATEST rule (via ref, not a stale closure) and
    // onto DB defaults, so a partial upsert never blanks fields we aren't
    // touching and rapid clicks accumulate instead of racing.
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
    // Update the ref + UI synchronously — instant feedback, never blocks.
    ruleRef.current = merged;
    setRule(merged);
    try {
      const { id: _id, created_at: _ca, ...payload } = merged;
      const saved = await upsertAvailabilityRule(payload);
      // Only adopt the server's immutable identifiers, and only the first
      // time, so a slow response can't clobber a newer rapid edit.
      if (!ruleRef.current.id) {
        ruleRef.current = { ...ruleRef.current, id: saved.id, created_at: saved.created_at };
        setRule((r) => (r ? { ...r, id: saved.id, created_at: saved.created_at } : r));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save availability rules.");
    }
  };

  // Blocked Dates
  const toggleBlocked = async (date: string, reason?: string) => {
    if (!draft) return;
    // Optimistic toggle off the latest list (via ref) so rapid clicks don't
    // race, and the calendar flips instantly without a network round-trip.
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
      // Revert on failure.
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
      const updatedBlocked = await getBlockedDates(draft.id);
      setBlockedDates(updatedBlocked);
      blockedRef.current = updatedBlocked;
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
      const updatedBlocked = await getBlockedDates(draft.id);
      setBlockedDates(updatedBlocked);
      blockedRef.current = updatedBlocked;
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

export type UseHotelDraftReturn = ReturnType<typeof useHotelDraft>;
