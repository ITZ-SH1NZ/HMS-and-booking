"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpGuest, signInWithGoogle } from "@/lib/auth";
import DatePicker from "@/components/DatePicker";
import { AuthShell } from "@/components/AuthShell";
import { primaryBtn } from "@/components/AuthCard";
import {
  IconField,
  PasswordField,
  FieldLabel,
  bareInput,
} from "@/components/AuthFields";
import { Stepper } from "@/components/FormBits";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  CalendarIcon,
  PhoneIcon,
  MapPinIcon,
  GoogleIcon,
} from "@/components/icons";

const secondaryBtn =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

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

export default function GuestSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");
  const [terms, setTerms] = useState(false);

  // Date of Birth
  const [dob, setDob] = useState("");

  // Location Autocomplete State
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setStep(2);
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-up failed. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms) return setError("Please accept the Terms & Conditions.");
    if (!dob) return setError("Please enter your date of birth.");

    setLoading(true);
    try {
      const phone = phoneNo ? `${countryCode}${phoneNo}` : "";
      await signUpGuest({ email, password, fullName, dob, phone, location });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      if (/already registered|already been registered|exists/i.test(message)) {
        setError("An account with this email already exists. Try logging in.");
      } else if (/password/i.test(message)) {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      side={{
        title: "Start your journey",
        subtitle: "Create an account to book stays and manage your trips.",
      }}
    >
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step {step} of 2 — {step === 1 ? "Account details" : "Profile information"}
      </p>

      <div className="mt-5">
        <Stepper step={step} total={2} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {error}
        </div>
      )}

      {step === 1 ? (
        <>
          <form onSubmit={goToStep2} className="space-y-4 text-left">
            <div>
              <FieldLabel>Email</FieldLabel>
              <IconField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                icon={<MailIcon className="h-4 w-4" />}
              />
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                icon={<LockIcon className="h-4 w-4" />}
              />
            </div>
            <div>
              <FieldLabel>Confirm password</FieldLabel>
              <PasswordField
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                icon={<LockIcon className="h-4 w-4" />}
              />
            </div>
            <button type="submit" className={primaryBtn}>
              Next
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <GoogleIcon className="h-5 w-5" /> Sign up with Google
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
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

          {/* Date of Birth Field (Custom Calendar Picker) */}
          <div>
            <FieldLabel>Date of birth</FieldLabel>
            <DatePicker
              value={dob}
              onChange={setDob}
              placeholder="Select date of birth"
              required
            />
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

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 accent-brand-600"
            />
            I accept the Terms &amp; Conditions
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={secondaryBtn}
            >
              Back
            </button>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
