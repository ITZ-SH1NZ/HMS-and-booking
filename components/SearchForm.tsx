"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  SearchIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "@/components/icons";

// Search form shown in the navbar (compact) and the hero (full).
// Submitting navigates to "/" with the criteria as query params, which the
// landing page reads to filter hotels.
export function SearchForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const [location, setLocation] = useState(params.get("location") ?? "");
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");
  const [guests, setGuests] = useState(params.get("guests") ?? "1");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = new URLSearchParams();
    if (location) query.set("location", location);
    if (checkIn) query.set("checkIn", checkIn);
    if (checkOut) query.set("checkOut", checkOut);
    if (guests) query.set("guests", guests);
    router.push(`/?${query.toString()}#hotels`);
  }

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1 rounded-full border border-slate-300 py-1 pl-4 pr-1 shadow-sm"
      >
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Search location"
          className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="grid h-8 w-8 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
          aria-label="Search"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-5xl rounded-2xl bg-white p-4 text-left shadow-xl"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:divide-x lg:divide-slate-200">
        <Field icon={<MapPinIcon className="h-4 w-4" />} label="Destination">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where are you going?"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </Field>
        <Field icon={<CalendarIcon className="h-4 w-4" />} label="Check In">
          <DateInput value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field icon={<CalendarIcon className="h-4 w-4" />} label="Check Out">
          <DateInput value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
        <Field
          icon={<UserIcon className="h-4 w-4" />}
          label="Guests"
          trailing={<ChevronDownIcon className="h-4 w-4" />}
        >
          <select
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full appearance-none bg-transparent text-sm text-slate-700 outline-none"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center lg:pl-2">
          <button
            type="submit"
            className="w-full rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Search Hotels
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
        <Badge>Best Price Guarantee</Badge>
        <Badge>Free Cancellation</Badge>
        <Badge>Secure Booking</Badge>
      </div>
    </form>
  );
}

function Field({
  icon,
  label,
  children,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-50">
      <span className="text-rose-500">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {children}
      </span>
      {trailing && <span className="text-slate-400">{trailing}</span>}
    </label>
  );
}

// Shows "Add dates" until focused/filled, then behaves as a native date picker.
function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={value ? "date" : "text"}
      value={value}
      onChange={onChange}
      placeholder="Add dates"
      onFocus={(e) => {
        e.currentTarget.type = "date";
      }}
      onBlur={(e) => {
        if (!e.currentTarget.value) e.currentTarget.type = "text";
      }}
      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
    />
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
      {children}
    </span>
  );
}
