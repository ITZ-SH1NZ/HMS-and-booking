"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { revalidateHotels } from "@/app/actions/hotels";
import { MapPinIcon } from "@/components/icons";
import type { Hotel, ManagerVerification, Profile } from "@/lib/types";

type ManagerRow = ManagerVerification & { profiles: Pick<Profile, "full_name"> | null };

export default function AdminDashboardPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
const [totalHotels, setTotalHotels] = useState(0);
const [totalReviews, setTotalReviews] = useState(0);
const [totalManagers, setTotalManagers] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [
  mv,
  ht,
  usersCount,
  hotelsCount,
  reviewsCount,
  managersCount,
] = await Promise.all([
  supabase
    .from("manager_verifications")
    .select("*, profiles(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false }),

  supabase
    .from("hotels")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false }),

  supabase
    .from("profiles")
    .select("*", { count: "exact", head: true }),

  supabase
    .from("hotels")
    .select("*", { count: "exact", head: true }),

  supabase
    .from("reviews")
    .select("*", { count: "exact", head: true }),

  supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "manager"),
]);
    setManagers((mv.data as ManagerRow[] | null) ?? []);
    setHotels((ht.data as Hotel[] | null) ?? []);
    setTotalUsers(usersCount.count ?? 0);
setTotalHotels(hotelsCount.count ?? 0);
setTotalReviews(reviewsCount.count ?? 0);
setTotalManagers(managersCount.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial data fetch from Supabase (external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function reviewManager(
    id: string,
    status: "approved" | "rejected",
    reason?: string,
  ) {
    setBusy(id);
    const supabase = createClient();
    await supabase
      .from("manager_verifications")
      .update({
        status,
        rejection_reason: status === "rejected" ? reason ?? "" : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(null);
    load();
  }

  async function reviewHotel(id: string, status: "approved" | "rejected") {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("hotels").update({ status }).eq("id", id);
    // Refresh cached catalog/listing so the change shows immediately.
    await revalidateHotels();
    setBusy(null);
    load();
  }

  async function viewDocument(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("manager-documents")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Admin panel</h1>
      <p className="text-sm text-slate-500">
        Review manager applications and hotel listings.
      </p>
<div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

  <div className="rounded-xl border border-slate-200 bg-blue-50 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm text-slate-600">Users</h3>
        <p className="text-3xl font-bold text-slate-900">{totalUsers}</p>
      </div>
      <span className="text-3xl">👤</span>
    </div>
  </div>

  <div className="rounded-xl border border-slate-200 bg-emerald-50 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm text-slate-600">Hotels</h3>
        <p className="text-3xl font-bold text-slate-900">{totalHotels}</p>
      </div>
      <span className="text-3xl">🏨</span>
    </div>
  </div>

  <div className="rounded-xl border border-slate-200 bg-amber-50 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm text-slate-600">Reviews</h3>
        <p className="text-3xl font-bold text-slate-900">{totalReviews}</p>
      </div>
      <span className="text-3xl">⭐</span>
    </div>
  </div>

  <div className="rounded-xl border border-slate-200 bg-rose-50 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm text-slate-600">Managers</h3>
        <p className="text-3xl font-bold text-slate-900">{totalManagers}</p>
      </div>
      <span className="text-3xl">👨‍💼</span>
    </div>
  </div>

</div>
      {/* Managers */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Pending manager applications ({managers.length})
        </h2>
        {managers.length === 0 ? (
          <Empty text="No manager applications waiting for review." />
        ) : (
          <div className="space-y-3">
            {managers.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {m.business_name ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {m.profiles?.full_name ?? "Unknown"} · Reg #
                      {m.registration_number ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500">{m.business_address}</p>
                    {m.document_url && (
                      <button
                        onClick={() => viewDocument(m.document_url!)}
                        className="mt-1 text-sm font-semibold text-rose-600 underline"
                      >
                        View document
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busy === m.id}
                      onClick={() => reviewManager(m.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy === m.id}
                      onClick={() => {
                        const reason = window.prompt("Reason for rejection:");
                        if (reason !== null) reviewManager(m.id, "rejected", reason);
                      }}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Hotels */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Pending hotels ({hotels.length})
        </h2>
        {hotels.length === 0 ? (
          <Empty text="No hotels waiting for approval." />
        ) : (
          <div className="space-y-3">
            {hotels.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{h.name}</p>
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPinIcon className="h-4 w-4 text-rose-500" /> {h.location}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy === h.id}
                    onClick={() => reviewHotel(h.id, "approved")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === h.id}
                    onClick={() => reviewHotel(h.id, "rejected")}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
