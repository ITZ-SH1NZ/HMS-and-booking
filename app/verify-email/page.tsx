"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resendVerification } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";
  const isManager = params.get("role") === "manager";

  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll the auth state every 5s. Once the user clicks the verification link
  // (in the same browser), the session cookie appears here and we redirect.
  useEffect(() => {
    const supabase = createClient();
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        clearInterval(interval);
        router.replace(isManager ? "/manager/waiting" : "/");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [router, isManager]);

  async function handleResend() {
    setError(null);
    try {
      await resendVerification(email);
      setResent(true);
    } catch {
      setError("Couldn't resend the email. Try again in a minute.");
    }
  }

  return (
    <AuthCard title="Verify your email">
      <div className="space-y-4 text-sm text-slate-600">
        <div className="grid place-items-center py-2 text-5xl">📬</div>
        <p>
          We&apos;ve sent a verification link to{" "}
          <span className="font-semibold text-slate-900">{email}</span>.
        </p>
        <p>Click the link in your email to verify your account.</p>

        {isManager && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            After verifying your email, an admin will review your documents.
            You&apos;ll be notified once your application is approved or rejected.
          </div>
        )}

        <p className="text-xs text-slate-400">
          This page checks automatically every few seconds and will redirect you
          once you&apos;re verified.
        </p>

        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </div>
        )}

        <button
          onClick={handleResend}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {resent ? "Verification email sent!" : "Didn't get the email? Resend"}
        </button>

        <p className="text-center">
          <Link href="/login" className="font-semibold text-rose-600">
            Back to login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
