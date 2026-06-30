"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeProfile } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { primaryBtn } from "@/components/AuthCard";
import {
  IconField,
  FieldLabel,
  FieldShell,
  bareInput,
} from "@/components/AuthFields";
import {
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  MapPinIcon,
} from "@/components/icons";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+61", flag: "🇦🇺" },
  { code: "+971", flag: "🇦🇪" },
  { code: "+65", flag: "🇸🇬" },
  { code: "+81", flag: "🇯🇵" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" },
];

interface LocationSuggestion {
  id: number;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");
  
  // Date of Birth (Split Select State)
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dob, setDob] = useState("");

  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  // Day/Month/Year Change Handlers
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDobDay(val);
    if (val.length === 2) {
      monthInputRef.current?.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDobMonth(val);
    if (val.length === 2) {
      yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setDobYear(val);
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !dobMonth) {
      dayInputRef.current?.focus();
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !dobYear) {
      monthInputRef.current?.focus();
    }
  };

  // Location Autocomplete State
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync split DOB into YYYY-MM-DD
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setDob(`${dobYear}-${dobMonth}-${dobDay.padStart(2, "0")}`);
    } else {
      setDob("");
    }
  }, [dobDay, dobMonth, dobYear]);

  // Sync locationInput into location state
  useEffect(() => {
    setLocation(locationInput);
  }, [locationInput]);

  // Debounced Location Autocomplete Fetching (OpenStreetMap Nominatim)
  useEffect(() => {
    const query = locationInput.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();

        const items = data.map((item: any) => {
          const addr = item.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county;
          const state = addr.state;
          const country = addr.country;

          let displayName = item.display_name;
          if (city && country) {
            displayName = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
          }

          return {
            id: item.place_id,
            name: displayName,
          };
        });

        setSuggestions(items);
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [locationInput]);

  // Prefill what we already have (name comes from the OAuth provider); bounce
  // out if there's no session, or if the profile is already complete.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, dob, location")
        .eq("id", user.id)
        .single();

      if (profile?.phone) {
        router.replace("/");
        return;
      }

      setFullName(
        profile?.full_name ??
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          "",
      );

      if (profile?.dob) {
        const parts = profile.dob.split("-");
        if (parts.length === 3) {
          setDobYear(parts[0]);
          setDobMonth(parts[1]);
          setDobDay(parseInt(parts[2]).toString());
        }
      }
      
      if (profile?.location) {
        setLocationInput(profile.location);
        setLocation(profile.location);
      }
      
      setReady(true);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const phone = phoneNo ? `${countryCode}${phoneNo}` : "";
      await completeProfile({ fullName, dob, phone, location });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details");
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <AuthShell
      side={{
        title: "Almost there",
        subtitle: "A few more details and your account is ready to go.",
      }}
    >
      <h1 className="text-2xl font-bold text-slate-900">Complete your profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        We just need a little more information to finish setting up your account.
      </p>

      {error && (
        <div className="mb-4 mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
        <div>
          <FieldLabel>Full name</FieldLabel>
          <IconField
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            required
            icon={<UserIcon className="h-4 w-4" />}
          />
        </div>

        {/* Location Autocomplete Field */}
        <div className="relative">
          <FieldLabel>Default location</FieldLabel>
          <div className="relative">
            <MapPinIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Start typing your city..."
              className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg divide-y divide-slate-50">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setLocationInput(s.name);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-slate-700 hover:bg-slate-50 transition"
                  >
                    <MapPinIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date of Birth Field (Segmented Auto-focusing Inputs) */}
        <div>
          <FieldLabel>Date of birth</FieldLabel>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-250 bg-white px-3.5 py-2.5 focus-within:border-brand-500 transition">
            <input
              ref={dayInputRef}
              type="text"
              inputMode="numeric"
              placeholder="DD"
              value={dobDay}
              onChange={handleDayChange}
              className="w-8 bg-transparent text-center text-sm font-medium outline-none placeholder:text-slate-300 text-slate-800"
            />
            <span className="text-slate-300 text-sm font-medium">/</span>
            <input
              ref={monthInputRef}
              type="text"
              inputMode="numeric"
              placeholder="MM"
              value={dobMonth}
              onChange={handleMonthChange}
              onKeyDown={handleMonthKeyDown}
              className="w-8 bg-transparent text-center text-sm font-medium outline-none placeholder:text-slate-300 text-slate-800"
            />
            <span className="text-slate-300 text-sm font-medium">/</span>
            <input
              ref={yearInputRef}
              type="text"
              inputMode="numeric"
              placeholder="YYYY"
              value={dobYear}
              onChange={handleYearChange}
              onKeyDown={handleYearKeyDown}
              className="w-12 bg-transparent text-center text-sm font-medium outline-none placeholder:text-slate-300 text-slate-800"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Phone number</FieldLabel>
          <div className="flex gap-2">
            <div className="relative shrink-0 flex items-center">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-250 bg-white text-sm font-semibold focus:border-brand-500 focus:outline-none cursor-pointer appearance-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <PhoneIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                required
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, ""))}
                placeholder="Mobile number"
                className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Saving…" : "Finish setup"}
        </button>
      </form>
    </AuthShell>
  );
}
