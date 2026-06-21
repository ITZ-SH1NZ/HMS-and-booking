"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Price } from "@/components/Price";
import {
  UsersIcon,
  PlusIcon,
  MinusIcon,
  ShieldIcon,
  BoltIcon,
  LockIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/icons";
import { nightsBetween } from "@/lib/booking";
import type { AvailabilityRule, Hotel } from "@/lib/types";

interface BookingWidgetProps {
  hotel: Hotel;
  minPrice: number | null;
  avgRating: number | null;
  reviewCount: number;
  availabilityRule: AvailabilityRule | null;
}

const todayStr = () => new Date().toISOString().split("T")[0];
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

export function BookingWidget({
  hotel,
  minPrice,
  avgRating,
  reviewCount,
  availabilityRule,
}: BookingWidgetProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(todayStr());
  const [checkOut, setCheckOut] = useState(addDays(todayStr(), 1));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [numRooms, setNumRooms] = useState(1);
  
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const nights = nightsBetween(checkIn, checkOut);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowGuestDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalGuests = adults + children;

  const handleCheckAvailability = async () => {
    if (nights < 1) {
      setError("Checkout date must be after check-in.");
      return;
    }
    
    // Check minimum stay rule if available
    if (availabilityRule) {
      const isWeekend = new Date(checkIn).getDay() === 5 || new Date(checkIn).getDay() === 6;
      const minStay = isWeekend ? availabilityRule.min_stay_weekend : availabilityRule.min_stay_weekday;
      if (nights < minStay) {
        setError(`This property requires a minimum stay of ${minStay} night${minStay > 1 ? "s" : ""} on ${isWeekend ? "weekends" : "weekdays"}.`);
        return;
      }
    }

    setChecking(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/availability?hotelId=${hotel.id}&checkIn=${checkIn}&checkOut=${checkOut}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to check availability");

      const availableRooms = (json.rooms as { available: number }[]) ?? [];
      const totalAvailable = availableRooms.reduce((sum: number, r) => sum + r.available, 0);

      if (totalAvailable < numRooms) {
        setError(`Not enough rooms available for the selected dates. Only ${totalAvailable} room${totalAvailable === 1 ? "" : "s"} left.`);
      } else {
        // Redirect to booking page with params
        router.push(
          `/hotels/${hotel.id}/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${numRooms}`
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Could not check availability. Please try again.";
      setError(errMsg);
    } finally {
      setChecking(false);
    }
  };

  // Determine free cancellation date
  const getFreeCancellationDate = () => {
    const ciDate = new Date(`${checkIn}T00:00:00`);
    if (hotel.cancellation_policy === "flexible") {
      ciDate.setDate(ciDate.getDate() - 1);
      return ciDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } else if (hotel.cancellation_policy === "moderate") {
      ciDate.setDate(ciDate.getDate() - 5);
      return ciDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }
    return null;
  };

  const cancelDate = getFreeCancellationDate();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sticky top-36 transition duration-300">
      {/* Header Price + Ratings */}
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div>
          {minPrice !== null ? (
            <div className="flex items-baseline">
              <span className="text-2xl font-black text-slate-900">
                <Price amount={minPrice} />
              </span>
              <span className="text-sm font-medium text-slate-500 ml-1">/ night</span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-500">Contact for pricing</span>
          )}
          <span className="text-[10px] text-slate-400 font-medium block">Inclusive of all taxes</span>
        </div>

        {avgRating && (
          <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
            <StarIcon className="h-4 w-4 text-gold-500" filled />
            <span>{avgRating.toFixed(1)}</span>
            <span className="text-slate-400 font-semibold">·</span>
            <span className="text-slate-500 font-medium text-xs">
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* Date Picker Section */}
      <div className="space-y-3">
        <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider">
          Dates of Stay
        </label>
        <DateRangePicker checkIn={checkIn} checkOut={checkOut} onChange={(ci, co) => {
          setCheckIn(ci);
          setCheckOut(co);
          setError(null);
        }} />
      </div>

      {/* Guest and Room Selector */}
      <div ref={dropdownRef} className="relative mt-4">
        <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1.5">
          Guests & Rooms
        </label>
        <button
          type="button"
          onClick={() => setShowGuestDropdown(!showGuestDropdown)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 text-left text-sm font-bold text-slate-900 bg-white hover:border-brand-300 transition"
        >
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <span>
              {totalGuests} Guest{totalGuests === 1 ? "" : "s"}, {numRooms} Room{numRooms === 1 ? "" : "s"}
            </span>
          </div>
          {showGuestDropdown ? (
            <ChevronUpIcon className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {showGuestDropdown && (
          <div className="absolute right-0 left-0 top-full mt-2 z-40 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-1">
            {/* Adults Counter */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Adults</p>
                <p className="text-xs text-slate-400">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdults((a) => Math.max(1, a - 1))}
                  disabled={adults <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-30"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center font-bold text-slate-800 text-sm">{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults((a) => a + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Children Counter */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Children</p>
                <p className="text-xs text-slate-400">Ages 2 – 12</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChildren((c) => Math.max(0, c - 1))}
                  disabled={children <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-30"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center font-bold text-slate-800 text-sm">{children}</span>
                <button
                  type="button"
                  onClick={() => setChildren((c) => c + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Rooms Counter */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Rooms</p>
                <p className="text-xs text-slate-400">Number of rooms required</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNumRooms((r) => Math.max(1, r - 1))}
                  disabled={numRooms <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-30"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center font-bold text-slate-800 text-sm">{numRooms}</span>
                <button
                  type="button"
                  onClick={() => setNumRooms((r) => r + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs text-brand-700 font-semibold leading-relaxed">
          {error}
        </div>
      )}

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleCheckAvailability}
        disabled={checking}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer text-center"
      >
        {checking ? "Checking availability..." : "Check availability"}
      </button>

      <span className="block text-center text-xs text-slate-400 mt-2 font-medium">
        You won&apos;t be charged yet
      </span>

      {/* Trust rows */}
      <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
        {cancelDate && (
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-600">
              <BoltIcon className="h-3.5 w-3.5" />
            </span>
            <span>Free cancellation before {cancelDate}</span>
          </div>
        )}
        
        {hotel.payment_policy === "pay_at_property" && (
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ShieldIcon className="h-3.5 w-3.5" />
            </span>
            <span>No prepayment needed — pay at arrival</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-600">
            <LockIcon className="h-3.5 w-3.5" />
          </span>
          <span>Secure booking with BookNest protection</span>
        </div>
      </div>
    </div>
  );
}
