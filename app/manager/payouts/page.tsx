"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BoltIcon } from "@/components/icons";

// Where a manager links their Razorpay Route account so booking payments are
// split to them automatically (minus the platform commission).
export default function PayoutsPage() {
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("razorpay_account_id")
        .eq("id", user.id)
        .maybeSingle();
      setAccountId(data?.razorpay_account_id ?? "");
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ razorpay_account_id: accountId.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) setError(error.message);
    else setSaved(true);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Payout settings</h1>
      <p className="text-sm text-slate-500">
        Link your Razorpay account to receive booking payments automatically.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Razorpay linked account ID
            </label>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="acc_XXXXXXXXXXXX"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-2 text-xs text-slate-400">
              Create a linked account in Razorpay (Route → Linked Accounts) and
              paste its <code>acc_…</code> id here. While this is empty, payments
              go to the platform and are settled to you manually.
            </p>

            {error && (
              <p className="mt-3 text-sm text-brand-700">{error}</p>
            )}
            {saved && (
              <p className="mt-3 flex items-center gap-1 text-sm text-green-700">
                <BoltIcon className="h-4 w-4" /> Saved
              </p>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <span>
          Route splits require the Route feature enabled on the platform
          Razorpay account and a KYC-verified linked account. Until then this
          stays dormant and the platform collects payments.
        </span>
      </div>
    </div>
  );
}
