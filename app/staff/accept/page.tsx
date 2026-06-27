"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircleIcon, ClockIcon } from "@/components/icons";
import { acceptInvites } from "./actions";

type State =
  | { kind: "loading" }
  | { kind: "needs-auth" }
  | { kind: "done"; count: number }
  | { kind: "error"; message: string };

function AcceptInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setState({ kind: "needs-auth" });
        return;
      }
      const res = await acceptInvites();
      if (!active) return;
      if (res.ok) setState({ kind: "done", count: res.count ?? 0 });
      else setState({ kind: "error", message: res.error ?? "Something went wrong." });
    })();
    return () => {
      active = false;
    };
  }, []);

  const loginHref = `/login?redirect=${encodeURIComponent(`/staff/accept${token ? `?token=${token}` : ""}`)}`;

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state.kind === "loading" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <p className="mt-4 text-sm text-slate-500">Checking your invite…</p>
          </>
        )}

        {state.kind === "needs-auth" && (
          <>
            <ClockIcon className="mx-auto h-10 w-10 text-brand-500" />
            <h1 className="mt-3 text-lg font-bold text-slate-900">Sign in to accept</h1>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ve been invited to help manage a hotel. Sign in (or create an account) with the email
              your invite was sent to.
            </p>
            <Link
              href={loginHref}
              className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Sign in
            </Link>
          </>
        )}

        {state.kind === "done" && (
          <>
            <CheckCircleIcon className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="mt-3 text-lg font-bold text-slate-900">
              {state.count > 0 ? "You're all set!" : "Nothing to accept"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {state.count > 0
                ? `You've been added to ${state.count} hotel${state.count > 1 ? "s" : ""}.`
                : "There are no pending invites for your account right now."}
            </p>
            <Link
              href="/manager/manage"
              className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {state.kind === "error" && (
          <>
            <h1 className="text-lg font-bold text-slate-900">Couldn&apos;t accept invite</h1>
            <p className="mt-1 text-sm text-brand-700">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function StaffAcceptPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInner />
    </Suspense>
  );
}
