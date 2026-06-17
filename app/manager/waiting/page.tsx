import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClockIcon, BanIcon } from "@/components/icons";
import type { VerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManagerWaitingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mv } = await supabase
    .from("manager_verifications")
    .select("status, rejection_reason, business_name")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = (mv?.status as VerificationStatus) ?? "pending";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status === "rejected" ? (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600">
              <BanIcon className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Application rejected
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your application was rejected:
            </p>
            <p className="mt-1 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {mv?.rejection_reason ?? "No reason provided."}
            </p>
            <Link
              href="/signup/manager"
              className="mt-6 inline-block rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Apply again
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
              <ClockIcon className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Waiting for admin approval
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your application{mv?.business_name ? ` for ${mv.business_name}` : ""} is
              under review. You&apos;ll get an email when it&apos;s approved.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Make sure your email is verified — that&apos;s required before an
              admin reviews your documents.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
