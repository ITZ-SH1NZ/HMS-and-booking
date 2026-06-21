"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { publishDraft } from "@/lib/hotelDraft";
import { CheckCircleIcon, MapPinIcon, StarIcon } from "@/components/icons";
import { UseHotelDraftReturn } from "../useHotelDraft";
import type { RoomDraft, HotelPhoto } from "@/lib/types";

interface Step9ReviewProps {
  draftContext: UseHotelDraftReturn;
  onStepClick: (step: number) => void;
}

export default function Step9Review({ draftContext, onStepClick }: Step9ReviewProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { draft, rooms, photos, setError } = draftContext;

  if (!draft) return null;

  // Compute stats
  const activeRooms = rooms.filter((r: RoomDraft) => r.is_active);
  const totalRoomTypes = activeRooms.length;
  const totalRoomsCount = activeRooms.reduce((sum: number, r: RoomDraft) => sum + (r.total_units || 0), 0);
  const maxGuests = activeRooms.reduce((max: number, r: RoomDraft) => Math.max(max, r.capacity || 0), 0);
  const amenitiesCount = draft.amenities?.length || 0;

  // Find minimum active room price
  const minRoomPrice = activeRooms.length > 0
    ? Math.min(...activeRooms.map((r: RoomDraft) => r.price || 0))
    : 0;

  const coverPhoto = photos.find((p: HotelPhoto) => p.category === "cover");
  const coverUrl = coverPhoto ? coverPhoto.url : null;

  // Address
  let addressText = "Location details incomplete";
  if (draft.city || draft.state || draft.country) {
    addressText = [draft.city, draft.state, draft.country].filter(Boolean).join(", ");
  }

  const handlePublish = async () => {
    if (!agreed) {
      alert("Please agree to the Terms & Conditions and Privacy Policy first.");
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      await publishDraft(draft.id);
      // Success redirect with query param for toast
      router.push("/manager/dashboard?published=success");
      router.refresh();
    } catch (err) {
      console.error("Publishing error", err);
      setError(err instanceof Error ? err.message : "Failed to publish listing.");
      setPublishing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Review Details Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Review your property details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Cover image preview */}
          <div className="md:col-span-4 rounded-xl overflow-hidden aspect-[1.3/1] bg-slate-100 border border-slate-200 shrink-0 relative">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="Cover preview"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No cover image uploaded
              </div>
            )}
            <button
              type="button"
              onClick={() => onStepClick(3)}
              className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-white text-slate-700 px-2 py-1 rounded shadow-sm hover:bg-slate-50 transition"
            >
              Change
            </button>
          </div>

          {/* Core details summary */}
          <div className="md:col-span-8 space-y-2">
            <div className="flex justify-between items-start gap-4">
              <h4 className="font-extrabold text-xl text-slate-900 leading-tight">
                {draft.name || "Untitled Property"}
              </h4>
              <button
                type="button"
                onClick={() => onStepClick(1)}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Edit
              </button>
            </div>
            <p className="flex items-center gap-1 text-sm text-slate-500 font-semibold">
              <MapPinIcon className="h-4 w-4 text-brand-500" />
              {addressText}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5 text-gold-500">
                <StarIcon className="h-4 w-4" filled />
                <span className="text-xs font-bold text-slate-800 ml-1">
                  {draft.star_rating || 0}.0 Star
                </span>
              </div>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-semibold text-slate-700 capitalize">
                {draft.property_type || "Property Type"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-slate-100 pt-6">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              Room types
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {totalRoomTypes}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              Total rooms
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {totalRoomsCount}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              Max capacity
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {maxGuests} Guests
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              Amenities
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {amenitiesCount} Selected
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="mt-6 border-t border-slate-100 pt-6 space-y-3.5 text-xs">
          {/* Location details */}
          <div className="flex justify-between items-start gap-4">
            <span className="text-slate-500 font-medium shrink-0">Exact address</span>
            <div className="text-right flex flex-col gap-1 items-end">
              <span className="text-slate-800 font-bold">{draft.address_line}</span>
              <span className="text-slate-500">{draft.area}, Pincode: {draft.pincode}</span>
              <button
                type="button"
                onClick={() => onStepClick(2)}
                className="text-[10px] font-semibold text-brand-700 hover:text-brand-800 mt-1"
              >
                Edit location
              </button>
            </div>
          </div>

          {/* Check-in / out */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
            <span className="text-slate-500 font-medium">Check-in / Check-out</span>
            <div className="text-right flex items-center gap-2">
              <span className="text-slate-800 font-bold">
                In: {draft.check_in_time || "12:00 PM"} | Out: {draft.check_out_time || "11:00 AM"}
              </span>
              <button
                type="button"
                onClick={() => onStepClick(6)}
                className="text-[10px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Cancellation policy */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
            <span className="text-slate-500 font-medium">Cancellation policy</span>
            <div className="text-right flex items-center gap-2">
              <span className="text-slate-800 font-bold capitalize">
                {draft.cancellation_policy || "Not set"}
              </span>
              <button
                type="button"
                onClick={() => onStepClick(6)}
                className="text-[10px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Starting base price */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
            <span className="text-slate-500 font-medium">Starting room rate</span>
            <div className="text-right flex items-center gap-2">
              <span className="text-brand-800 font-extrabold text-sm">
                ₹{minRoomPrice} + taxes / night
              </span>
              <button
                type="button"
                onClick={() => onStepClick(4)}
                className="text-[10px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Edit rooms
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Publish Card */}
      <div className="rounded-2xl border border-slate-200 bg-brand-50/40 p-6 shadow-sm border-brand-100">
        <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <CheckCircleIcon className="h-5 w-5 text-brand-700 shrink-0" />
          Ready to publish?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          By clicking &quot;Publish listing&quot;, you submit your property details to the admin verification queue. Once verified, your hotel will become free and searchable to visitors on the platform.
        </p>

        {/* Agreements T&C */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none py-1 mb-5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 bg-white"
          />
          <span className="text-xs font-semibold text-slate-700 leading-normal">
            I agree to the Terms & Conditions and Privacy Policy, and confirm that all property information provided is accurate.
          </span>
        </label>

        {/* Publish Button */}
        <button
          type="button"
          disabled={!agreed || publishing}
          onClick={handlePublish}
          className="w-full py-3 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {publishing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Publishing Listing...
            </>
          ) : (
            "Publish listing"
          )}
        </button>
      </div>
    </div>
  );
}
