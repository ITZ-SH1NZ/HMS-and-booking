"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpManager } from "@/lib/auth";
import { AuthCard, inputClass, primaryBtn } from "@/components/AuthCard";
import { Stepper, Field } from "@/components/FormBits";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

export default function ManagerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // Step 2 — business
  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  // Step 3 — document
  const [document, setDocument] = useState<File | null>(null);
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

  function goToStep3(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!businessName.trim()) return setError("Business name is required.");
    setStep(3);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!document) return setError("Please upload a verification document.");
    if (!ACCEPTED.includes(document.type))
      return setError("Document must be a PDF, JPG, or PNG.");
    if (!terms) return setError("Please accept the Terms & Conditions.");

    setLoading(true);
    try {
      await signUpManager({
        email,
        password,
        fullName,
        phone,
        businessName,
        registrationNumber,
        businessAddress,
        document,
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}&role=manager`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      if (/already registered|already been registered|exists/i.test(message)) {
        setError("An account with this email already exists. Try logging in.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Become a Host"
      subtitle={`Step ${step} of 3 — ${
        step === 1 ? "Account" : step === 2 ? "Business" : "Verification"
      }`}
    >
      <Stepper step={step} total={3} />

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-4">
          <Field label="Full name">
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Phone number">
            <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="Confirm password">
            <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <button type="submit" className={primaryBtn}>Next</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={goToStep3} className="space-y-4">
          <Field label="Business name">
            <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </Field>
          <Field label="Registration number">
            <input className={inputClass} value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required />
          </Field>
          <Field label="Business address">
            <textarea className={inputClass} rows={3} value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} required />
          </Field>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
            <button type="submit" className={primaryBtn}>Next</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Business verification document">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-rose-600 hover:file:bg-rose-100"
              required
            />
          </Field>
          <p className="text-xs text-slate-500">Accepted formats: PDF, JPG, PNG.</p>
          {document && (
            <p className="text-xs text-slate-600">Selected: {document.name}</p>
          )}
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
            I accept the Terms &amp; Conditions
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? "Submitting…" : "Submit for Verification"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Booking a stay instead?{" "}
        <Link href="/signup" className="font-semibold text-rose-600">
          Sign up as a guest
        </Link>
      </p>
    </AuthCard>
  );
}
