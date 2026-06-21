"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpManager } from "@/lib/auth";
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
  PhoneIcon,
  LockIcon,
  BuildingIcon,
  TagIcon,
} from "@/components/icons";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

const secondaryBtn =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

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
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setStep(2);
  }

  function goToStep3(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Please enter your full name.");
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
    <AuthShell
      side={{
        title: "Become a Host",
        subtitle:
          "List your property on BookNest and reach travelers around the world.",
        image:
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
      }}
    >
      <h1 className="text-2xl font-bold text-slate-900">Become a Host</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step {step} of 3 —{" "}
        {step === 1 ? "Account" : step === 2 ? "Business" : "Verification"}
      </p>

      <div className="mt-5">
        <Stepper step={step} total={3} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <IconField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<MailIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<LockIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Confirm password</FieldLabel>
            <PasswordField
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              icon={<LockIcon className="h-4 w-4" />}
            />
          </div>
          <button type="submit" className={primaryBtn}>
            Next
          </button>
          <p className="text-center text-xs text-slate-400">
            Hosts sign up with email only — Google sign-in isn&apos;t available
            for host accounts.
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={goToStep3} className="space-y-4">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <IconField
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              icon={<UserIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Phone number</FieldLabel>
            <IconField
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              icon={<PhoneIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Business name</FieldLabel>
            <IconField
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              icon={<BuildingIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Registration number</FieldLabel>
            <IconField
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              required
              icon={<TagIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <FieldLabel>Business address</FieldLabel>
            <textarea
              className={`${bareInput} rounded-lg border border-slate-300 bg-slate-50 px-3 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100`}
              rows={3}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={secondaryBtn}
            >
              Back
            </button>
            <button type="submit" className={primaryBtn}>
              Next
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel>Business verification document</FieldLabel>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-600 hover:file:bg-brand-100"
              required
            />
          </div>
          <p className="text-xs text-slate-500">Accepted formats: PDF, JPG, PNG.</p>
          {document && (
            <p className="text-xs text-slate-600">Selected: {document.name}</p>
          )}
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
              onClick={() => setStep(2)}
              className={secondaryBtn}
            >
              Back
            </button>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? "Submitting…" : "Submit for Verification"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Booking a stay instead?{" "}
        <Link href="/signup" className="font-semibold text-brand-600">
          Sign up as a guest
        </Link>
      </p>
    </AuthShell>
  );
}
