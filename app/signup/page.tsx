"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpGuest, signInWithGoogle } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { primaryBtn } from "@/components/AuthCard";
import {
  IconField,
  PasswordField,
  FieldLabel,
  FieldShell,
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
          <form onSubmit={goToStep2} className="space-y-4">
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <FieldLabel>Default location</FieldLabel>
            <IconField
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              required
              icon={<MapPinIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Date of birth</FieldLabel>
            <FieldShell icon={<CalendarIcon className="h-4 w-4" />}>
              <input
                type="date"
                className={bareInput}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </FieldShell>
          </div>
          <div>
            <FieldLabel>Phone number</FieldLabel>
            <IconField
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
              icon={<PhoneIcon className="h-4 w-4" />}
            />
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
