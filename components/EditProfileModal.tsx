"use client";

import { useState, useEffect } from "react";
import { X, User, MapPin, Smartphone, ShieldCheck, Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import DatePicker from "@/components/DatePicker";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

interface LocationSuggestion {
  id: number;
  name: string;
}

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
];

export default function EditProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");

  // Location Autocomplete State
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Phone verification state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [step, setStep] = useState<"fields" | "otp">("fields");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [mockSmsToast, setMockSmsToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (data) {
          const prof = data as Profile;
          setProfile(prof);
          setFullName(prof.full_name || "");
          setDob(prof.dob || "");

          if (prof.location) {
            setLocationInput(prof.location);
            setLocation(prof.location);
          } else {
            setLocationInput("");
            setLocation("");
          }
          
          if (prof.phone) {
            // Try to parse country code and phone number
            const matchedCode = COUNTRY_CODES.find(c => prof.phone?.startsWith(c.code));
            if (matchedCode) {
              setCountryCode(matchedCode.code);
              setPhoneNumber(prof.phone.slice(matchedCode.code.length));
            } else {
              setPhoneNumber(prof.phone);
            }
            setIsPhoneVerified(true);
          } else {
            setPhoneNumber("");
            setIsPhoneVerified(false);
          }
        }
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
    setStep("fields");
    setMockSmsToast(null);
  }, [isOpen]);

  const handleSaveFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);

    try {
      // Validate DOB if entered
      if (dob) {
        const parts = dob.split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0]);
          if (y < 1900 || y > new Date().getFullYear()) {
            setError("Please enter a valid Date of Birth.");
            setSaving(false);
            return;
          }
        }
      }

      // If the phone number changed and is not verified, we keep profiles.phone as is or null
      let finalPhone = profile.phone;
      const formattedInputPhone = phoneNumber ? `${countryCode}${phoneNumber}` : "";
      
      if (formattedInputPhone === "") {
        finalPhone = null;
      } else if (isPhoneVerified && formattedInputPhone === profile.phone) {
        finalPhone = profile.phone;
      } else if (isPhoneVerified) {
        finalPhone = formattedInputPhone;
      } else {
        if (phoneNumber && formattedInputPhone !== profile.phone) {
          setError("Please verify your new phone number via OTP before saving.");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          dob: dob || null,
          location: location || null,
          phone: finalPhone,
        })
        .eq("id", profile.id);

      if (error) throw error;

      if (onProfileUpdated) onProfileUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const startPhoneVerification = () => {
    if (!phoneNumber.trim() || !/^\d{7,15}$/.test(phoneNumber.trim())) {
      setError("Please enter a valid phone number (digits only).");
      return;
    }
    setError(null);

    // Generate a mock 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setStep("otp");
    setOtpInput("");

    // Trigger mock SMS toast
    const fullNum = `${countryCode} ${phoneNumber}`;
    setMockSmsToast(`[Mock SMS] Verification code sent to ${fullNum}: ${otp}`);
  };

  const verifyOtp = () => {
    if (otpInput === generatedOtp) {
      setIsPhoneVerified(true);
      setStep("fields");
      setMockSmsToast(null);
      setError(null);
      
      // Auto-trigger save with new phone
      const formattedInputPhone = `${countryCode}${phoneNumber}`;
      setProfile(prev => prev ? { ...prev, phone: formattedInputPhone } : null);
    } else {
      setError("Invalid verification code. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
          <h3 className="text-base font-bold text-slate-800 font-serif tracking-tight">
            {step === "fields" ? "Edit Profile" : "Verify Phone Number"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Mock SMS Toast */}
        {mockSmsToast && (
          <div className="mx-6 mt-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 font-bold flex items-start gap-2.5 shadow-2xs">
            <Smartphone className="h-4.5 w-4.5 text-brand-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{mockSmsToast}</p>
              <p className="text-[10px] text-brand-650 mt-0.5 font-medium">In production, this would be sent via Twilio SMS.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Clock className="h-6 w-6 animate-spin text-brand-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading details</span>
            </div>
          ) : step === "fields" ? (
            <form onSubmit={handleSaveFields} className="space-y-5 text-left">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* Date of Birth (Custom Calendar Picker) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                <DatePicker
                  value={dob}
                  onChange={setDob}
                  placeholder="Select date of birth"
                  required
                />
              </div>

              {/* Location Autocomplete */}
              <div className="relative space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => {
                      setLocationInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Start typing your city..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500"
                    required
                  />
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg divide-y divide-slate-55">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setLocationInput(s.name);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-slate-755 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Phone Number with Region Dropdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  {isPhoneVerified && phoneNumber && (
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Verified
                    </span>
                  )}
                  {(!isPhoneVerified || !phoneNumber) && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Unverified
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <div className="relative shrink-0 flex items-center">
                    <select
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        setIsPhoneVerified(false);
                      }}
                      className="h-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-brand-500 focus:outline-none cursor-pointer appearance-none"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, ""));
                      setIsPhoneVerified(false);
                    }}
                    placeholder="Mobile number"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none text-sm font-medium transition"
                  />

                  {phoneNumber && !isPhoneVerified && (
                    <button
                      type="button"
                      onClick={startPhoneVerification}
                      className="px-3 py-2.5 rounded-xl bg-brand-700 text-white hover:bg-brand-850 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                    >
                      Verify
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  WhatsApp & calling features require a verified phone number.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#0A4335] text-white hover:bg-brand-900 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          ) : (
            // OTP verification step
            <div className="space-y-5 text-center">
              <div className="h-14 w-14 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="h-7 w-7 text-brand-700" />
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-800">Enter Verification Code</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  We have sent a 6-digit verification code to <span className="font-bold text-slate-700">{countryCode} {phoneNumber}</span>.
                </p>
              </div>

              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full text-center tracking-widest text-lg font-bold py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep("fields")}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={otpInput.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-brand-700 text-white hover:bg-brand-850 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Confirm Code
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
