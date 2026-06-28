"use client";

import { useEffect, useState, useTransition } from "react";
import useSWR, { mutate } from "swr";
import { motion } from "motion/react";
import { Panel } from "@/components/manager/Panel";
import { ShieldIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { reviewManager, getDocumentUrl } from "../actions";
import type { VerificationRow } from "@/app/api/admin/verifications/route";
import type { VerificationStatus } from "@/lib/types";

const STATUSES: (VerificationStatus | "all")[] = ["pending", "more_info", "approved", "rejected", "all"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  more_info: "More info",
  approved: "Approved",
  rejected: "Rejected",
  all: "All",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  more_info: "bg-sky-50 text-sky-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-brand-50 text-brand-700",
};

export default function VerificationsPage() {
  const [status, setStatus] = useState<VerificationStatus | "all">("pending");
  const [selected, setSelected] = useState<VerificationRow | null>(null);
  const key = `/api/admin/verifications?status=${status}`;
  const { data, isLoading } = useSWR<{ rows: VerificationRow[] }>(key);
  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Verifications</h1>
        <p className="text-sm text-slate-500">Review manager applications and their documents.</p>
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
          <EmptyState icon={<ShieldIcon className="h-6 w-6" />} title="Nothing here" description={`No ${STATUS_LABEL[status].toLowerCase()} applications.`} />
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
            {rows.map((r) => (
              <motion.button
                key={r.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -2, scale: 1.005, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                onClick={() => setSelected(r)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-300 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{r.business_name || "Unnamed business"}</p>
                  <p className="truncate text-sm text-slate-500">{r.profiles?.full_name ?? "Unknown applicant"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      <ReviewPanel row={selected} onClose={() => setSelected(null)} listKey={key} />
    </div>
  );
}

function ReviewPanel({ row, onClose, listKey }: { row: VerificationRow | null; onClose: () => void; listKey: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    setNote("");
    setError(null);
    setDocUrl(null);
    if (!row?.document_url) return;
    setDocLoading(true);
    getDocumentUrl(row.document_url).then((res) => {
      setDocUrl(res.url ?? null);
      setDocLoading(false);
    });
  }, [row]);

  if (!row) return null;
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(row.document_url ?? "");

  function act(decision: "approved" | "rejected" | "more_info") {
    if ((decision === "rejected" || decision === "more_info") && !note.trim()) {
      setError(decision === "rejected" ? "Add a reason for rejection." : "Add a note about what's needed.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reviewManager(row!.id, decision, note.trim() || undefined);
      if (res.ok) {
        await Promise.all([mutate(listKey), mutate("/api/admin/overview")]);
        onClose();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  return (
    <Panel open={!!row} onClose={onClose} title="Manager application">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{row.business_name || "Unnamed business"}</h3>
          <p className="text-sm text-slate-500">{row.profiles?.full_name ?? "Unknown applicant"}</p>
        </div>

        <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
          <Line label="Registration #" value={row.registration_number || "—"} />
          <Line label="Address" value={row.business_address || "—"} />
          {row.profiles?.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <PhoneIcon className="h-4 w-4 text-slate-400" /> {row.profiles.phone}
            </div>
          )}
        </dl>

        {/* Document viewer */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Verification document</p>
          {!row.document_url ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">No document uploaded.</p>
          ) : docLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
          ) : docUrl && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={docUrl} alt="Verification document" className="max-h-80 w-full rounded-lg border border-slate-200 object-contain" />
          ) : docUrl ? (
            <a href={docUrl} target="_blank" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-slate-55 transition-colors">
              <MailIcon className="h-4 w-4" /> Open document
            </a>
          ) : (
            <p className="text-sm text-brand-700">Couldn&apos;t load the document.</p>
          )}
        </div>

        {row.status !== "pending" && row.review_note && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Last note: </span>{row.review_note}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Reason / note (required to reject or request info)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Explain your decision…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}

        <div className="grid grid-cols-3 gap-2">
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
            onClick={() => act("more_info")}
            disabled={pending}
            className="rounded-lg border border-sky-300 bg-sky-50 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer transition-colors"
          >
            More info
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => act("approved")}
            disabled={pending}
            className="rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            Approve
          </motion.button>
        </div>
      </div>
    </Panel>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
