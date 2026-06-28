"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { motion } from "motion/react";
import { Panel } from "@/components/manager/Panel";
import { BuildingIcon, MapPinIcon, StarIcon } from "@/components/icons";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { reviewHotel } from "../actions";
import type { Hotel, PublicHotelDetail } from "@/lib/types";

const STATUSES = ["pending", "approved", "rejected", "all"] as const;
const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", all: "All" };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-brand-50 text-brand-700",
  draft: "bg-slate-100 text-slate-600",
};

type Row = Partial<Hotel> & { id: string; name: string; location: string; status: string };

export default function ListingsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [selected, setSelected] = useState<Row | null>(null);
  const key = `/api/admin/listings?status=${status}`;
  const { data, isLoading } = useSWR<{ rows: Row[] }>(key);
  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Listings</h1>
        <p className="text-sm text-slate-500">Review and moderate hotel listings before they go live.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.96 }}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-55"
            }`}
          >
            {STATUS_LABEL[s]}
          </motion.button>
        ))}
      </div>

      <div className="mt-5">
        {isLoading && !data ? (
          <SkeletonList count={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<BuildingIcon className="h-6 w-6" />} title="Nothing here" description={`No ${STATUS_LABEL[status].toLowerCase()} listings.`} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } }
            }}
            className="space-y-2.5"
          >
            {rows.map((h) => (
              <motion.button
                key={h.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -2, scale: 1.005, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                onClick={() => setSelected(h)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-300 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{h.name}</p>
                  <p className="flex items-center gap-1 truncate text-sm text-slate-500">
                    <MapPinIcon className="h-4 w-4 text-brand-500" /> {h.location}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[h.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[h.status] ?? h.status}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      <PreviewPanel row={selected} onClose={() => setSelected(null)} listKey={key} />
    </div>
  );
}

function PreviewPanel({ row, onClose, listKey }: { row: Row | null; onClose: () => void; listKey: string }) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { data: detail, isLoading } = useSWR<PublicHotelDetail>(row ? `/api/admin/listings/${row.id}` : null);

  function act(decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setError("Add a reason so the manager knows what to fix.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reviewHotel(row!.id, decision, reason.trim() || undefined);
      if (res.ok) {
        await Promise.all([mutate(listKey), mutate("/api/admin/overview")]);
        setReason("");
        onClose();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  const h = detail?.hotel;
  const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <Panel open={!!row} onClose={onClose} title="Listing review">
      {!row ? null : isLoading && !detail ? (
        <div className="space-y-3">
          <div className="aspect-[16/10] w-full animate-pulse rounded-lg bg-slate-100" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
        </div>
      ) : !detail || !h ? (
        <p className="text-sm text-brand-700">Couldn&apos;t load this listing.</p>
      ) : (
        <div className="space-y-4">
          {(detail.photos[0]?.url || h.image_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.photos[0]?.url || h.image_url || ""} alt={h.name} className="aspect-[16/10] w-full rounded-lg border border-slate-200 object-cover" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{h.name}</h3>
              {h.star_rating ? (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                  <StarIcon filled className="h-3.5 w-3.5" /> {h.star_rating}
                </span>
              ) : null}
            </div>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPinIcon className="h-4 w-4 text-brand-500" /> {[h.address_line, h.city, h.state, h.country].filter(Boolean).join(", ")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{h.property_type || "Hotel"}</p>
          </div>

          {(h.short_description || h.detailed_description) && (
            <p className="text-sm text-slate-650 leading-relaxed">{h.short_description || h.detailed_description}</p>
          )}

          {detail.rooms.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Rooms ({detail.rooms.length})</p>
              <div className="space-y-1.5">
                {detail.rooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-755">{r.name} <span className="text-slate-400">· {r.total_units} units</span></span>
                    <span className="font-semibold text-slate-900">{inr(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(h.amenities?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {h.amenities!.slice(0, 12).map((a) => (
                <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">{a}</span>
              ))}
            </div>
          )}

          <Link href={`/hotels/${h.id}`} target="_blank" className="block text-sm font-semibold text-brand-700 hover:underline">
            Open full listing preview →
          </Link>

          {row.status !== "pending" && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Current status: <b>{STATUS_LABEL[row.status] ?? row.status}</b>
              {row.rejection_reason ? ` · ${row.rejection_reason}` : ""}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rejection reason (required to reject)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="What needs fixing…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}

          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => act("rejected")}
              disabled={pending}
              className="rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Reject
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => act("approved")}
              disabled={pending}
              className="rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Approve & publish
            </motion.button>
          </div>
        </div>
      )}
    </Panel>
  );
}
