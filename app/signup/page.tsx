"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpGuest } from "@/lib/auth";
import { AuthCard, inputClass, primaryBtn } from "@/components/AuthCard";
import { Stepper, Field } from "@/components/FormBits";

export default function GuestSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  // Step 2
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [terms, setTerms] = useState(false);

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms) return setError("Please accept the Terms & Conditions.");

    setLoading(true);
    try {
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
    <AuthCard
      title="Create your account"
      subtitle={`Step ${step} of 2 — ${step === 1 ? "Account details" : "Profile information"}`}
    >
      <Stepper step={step} total={2} />

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={goToStep2} className="space-y-4">
          <Field label="Full name">
            <input
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Confirm password">
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <button type="submit" className={primaryBtn}>
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Date of birth">
            <input
              type="date"
              className={inputClass}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          <Field label="Default location">
            <input
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              required
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5"
            />
            I accept the Terms &amp; Conditions
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
        <Link href="/login" className="font-semibold text-rose-600">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
