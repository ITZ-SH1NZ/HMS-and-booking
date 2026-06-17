"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmail,
  signInWithGoogle,
  resendVerification,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthCard, inputClass, labelClass, primaryBtn } from "@/components/AuthCard";
import type { UserRole, VerificationStatus } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const redirect = params.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function routeByRole() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile?.role as UserRole) ?? "guest";

    if (redirect) {
      router.replace(redirect);
      return;
    }

    if (role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    if (role === "manager") {
      const { data: mv } = await supabase
        .from("manager_verifications")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = mv?.status as VerificationStatus | undefined;
      if (status === "rejected") {
        await supabase.auth.signOut();
        setError(
          `Your application was rejected: ${mv?.rejection_reason ?? "no reason provided"}. Please apply again.`,
        );
        return;
      }
      router.replace(status === "approved" ? "/manager/dashboard" : "/manager/waiting");
      return;
    }

    router.replace("/");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerify(false);
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      await refresh();
      await routeByRole();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (/email not confirmed|not confirmed/i.test(message)) {
        setNeedsVerify(true);
        setError("Please verify your email before logging in.");
      } else if (/invalid login credentials/i.test(message)) {
        setError("Invalid credentials. Check your email and password.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendVerification(email);
      setResent(true);
    } catch {
      setError("Couldn't resend the verification email.");
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed.");
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your HMS account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
            {needsVerify && (
              <button
                type="button"
                onClick={handleResend}
                className="ml-1 font-semibold underline"
              >
                {resent ? "Sent!" : "Resend link"}
              </button>
            )}
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        OR
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span>🌐</span> Login with Google
        <span className="text-xs font-normal text-slate-400">(guests)</span>
      </button>

      <div className="mt-6 space-y-1 text-center text-sm text-slate-500">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-rose-600">
            Sign up
          </Link>
        </p>
        <p>
          Want to list your property?{" "}
          <Link href="/signup/manager" className="font-semibold text-rose-600">
            Become a Host
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
