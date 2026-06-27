"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { mutate, preload } from "swr";
import { motion } from "motion/react";
import {
  MapPinIcon,
  BuildingIcon,
  PencilIcon,
  TrashIcon,
  GridIcon,
  GlobeIcon,
  EyeIcon,
  EyeOffIcon,
  XIcon,
  MoreIcon,
  CheckIcon,
} from "@/components/icons";
import { fetcher } from "@/lib/swr";
import { Panel } from "@/components/manager/Panel";
import {
  deleteHotel,
  deactivateHotel,
  reactivateHotel,
  getDeletionImpact,
  type DeletionImpact,
} from "./actions";
import type { ManagerHotelCard } from "./types";

const HOTELS_KEY = "/api/manager/hotels";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border border-green-300",
  pending: "bg-amber-50 text-amber-700 border border-amber-300",
  rejected: "bg-brand-50 text-brand-700 border border-brand-300",
  draft: "bg-slate-100 text-slate-700 border border-slate-300",
};

const FILTERS = ["all", "approved", "inactive", "pending", "draft", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

const isInactive = (h: ManagerHotelCard) => Boolean(h.deactivated_at);

export function HotelsGrid({ hotels }: { hotels: ManagerHotelCard[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<ManagerHotelCard | null>(null);

  const countFor = (f: Filter) =>
    f === "all" ? hotels.length : f === "inactive" ? hotels.filter(isInactive).length : hotels.filter((h) => h.status === f).length;

  const visible = hotels.filter((h) =>
    filter === "all" ? true : filter === "inactive" ? isInactive(h) : h.status === filter,
  );

  if (hotels.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <BuildingIcon className="h-8 w-8 text-slate-300" />
        <p className="mt-2 font-medium text-slate-700">No hotels yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Create your first hotel — it&apos;ll appear publicly once an admin approves it.
        </p>
        <Link
          href="/manager/create-hotel"
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add your first hotel
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = countFor(f);
          if (f === "inactive" && count === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No {filter} hotels.</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onDelete={() => setDeleting(hotel)} />
          ))}
        </motion.div>
      )}

      <DeletePanel hotel={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function HotelCard({ hotel, onDelete }: { hotel: ManagerHotelCard; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isDraft = hotel.status === "draft";
  const inactive = isInactive(hotel);
  const editHref = isDraft
    ? `/manager/create-hotel?hotelId=${hotel.id}&step=${hotel.wizard_step || 1}`
    : `/manager/create-hotel?hotelId=${hotel.id}`;

  const toggleActive = () =>
    startTransition(async () => {
      setMenuOpen(false);
      await (inactive ? reactivateHotel(hotel.id) : deactivateHotel(hotel.id));
      await mutate(HOTELS_KEY);
    });

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100">
        {hotel.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hotel.image_url} alt={hotel.name} className={`absolute inset-0 h-full w-full object-cover ${inactive ? "grayscale" : ""}`} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-slate-300">
            <BuildingIcon className="h-8 w-8" />
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            STATUS_STYLES[hotel.status] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {hotel.status}
        </span>
        {inactive && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Inactive
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900">{hotel.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
          <MapPinIcon className="h-4 w-4 text-brand-500" /> {hotel.location}
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span>{hotel.roomTypes} room type{hotel.roomTypes === 1 ? "" : "s"}</span>
          {hotel.capacity > 0 && (
            <span className="font-medium text-slate-700">
              Tonight: {hotel.occupiedTonight}/{hotel.capacity} occupied
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          {isDraft ? (
            <Link
              href={editHref}
              className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Resume draft
            </Link>
          ) : inactive ? (
            <button
              onClick={toggleActive}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <EyeIcon className="h-4 w-4" /> {pending ? "Working…" : "Reactivate"}
            </button>
          ) : (
            <Link
              href={`/manager/manage/${hotel.id}`}
              onMouseEnter={() => preload(`/api/manager/manage/${hotel.id}`, fetcher)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <GridIcon className="h-4 w-4" /> Manage
            </Link>
          )}
          <Link
            href={editHref}
            className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            aria-label="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg px-2 py-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              aria-label="More actions"
            >
              <MoreIcon className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute bottom-full right-0 z-20 mb-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {hotel.status === "approved" && !inactive && (
                    <Link
                      href={`/hotels/${hotel.id}`}
                      target="_blank"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <GlobeIcon className="h-4 w-4" /> View public
                    </Link>
                  )}
                  {!isDraft && (
                    <button
                      onClick={toggleActive}
                      disabled={pending}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {inactive ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                      {inactive ? "Reactivate" : "Deactivate"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
                  >
                    <TrashIcon className="h-4 w-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Multi-step delete flow ------------------------------------------------
const REASONS = [
  "No longer operating",
  "Sold or transferred",
  "Duplicate listing",
  "Rebranding",
  "Other",
] as const;

function DeletePanel({ hotel, onClose }: { hotel: ManagerHotelCard | null; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [impactErr, setImpactErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Reset + load impact whenever a hotel is targeted.
  useEffect(() => {
    if (!hotel) return;
    setStep(1);
    setImpact(null);
    setImpactErr(null);
    setReason("");
    setNote("");
    setTyped("");
    setError(null);
    let active = true;
    getDeletionImpact(hotel.id).then((res) => {
      if (!active) return;
      if ("error" in res) setImpactErr(res.error);
      else setImpact(res);
    });
    return () => {
      active = false;
    };
  }, [hotel]);

  if (!hotel) return null;

  const blocked = (impact?.activeBookings ?? 0) > 0;

  function confirmDelete() {
    if (typed !== hotel!.name) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteHotel(hotel!.id, reason, note.trim() || undefined);
      if (res.ok) {
        await mutate(HOTELS_KEY);
        onClose();
      } else {
        setError(res.error ?? "Failed to delete hotel.");
      }
    });
  }

  return (
    <Panel open={!!hotel} onClose={onClose} title={`Delete ${hotel.name}`}>
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-1.5">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-brand-600" : "bg-slate-200"}`} />
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
        {/* STEP 1 — impact */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Deleting this hotel removes it from public search and your dashboard. Here&apos;s what it affects:
            </p>
            {impactErr ? (
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{impactErr}</div>
            ) : !impact ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                <ImpactRow label="Room types" value={impact.roomTypes} />
                <ImpactRow label="Staff assigned" value={impact.staffCount} />
                <ImpactRow label="Past bookings (archived)" value={impact.totalBookings - impact.activeBookings} />
                <ImpactRow label="Active / upcoming bookings" value={impact.activeBookings} danger={impact.activeBookings > 0} />
              </ul>
            )}

            {blocked && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                This hotel has <b>{impact!.activeBookings}</b> active or upcoming booking(s). Cancel or complete them
                first — you can&apos;t delete a hotel guests are still booked into.
                <Link
                  href={`/manager/manage/${hotel.id}`}
                  className="mt-2 block font-semibold text-amber-900 underline"
                  onClick={onClose}
                >
                  Go to bookings →
                </Link>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!impact || blocked}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Continue
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              Just want to take it offline?{" "}
              <button
                onClick={() => {
                  startTransition(async () => {
                    await deactivateHotel(hotel.id);
                    await mutate(HOTELS_KEY);
                    onClose();
                  });
                }}
                className="font-semibold text-brand-700 hover:underline"
              >
                Deactivate instead
              </button>
            </p>
          </div>
        )}

        {/* STEP 2 — reason */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Why are you deleting this hotel? (kept on record)</p>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    reason === r ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {r}
                  {reason === r && <CheckIcon className="h-4 w-4 text-brand-600" />}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setStep(1)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!reason}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
              This permanently removes <b>{hotel.name}</b> from BookNest. This can&apos;t be undone.
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">
                Type <span className="font-bold text-slate-900">{hotel.name}</span> to confirm
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={hotel.name}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setStep(2)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Back
              </button>
              <button
                onClick={confirmDelete}
                disabled={typed !== hotel.name || pending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </Panel>
  );
}

function ImpactRow({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className={`font-bold ${danger ? "text-brand-700" : "text-slate-900"}`}>{value}</span>
    </li>
  );
}
