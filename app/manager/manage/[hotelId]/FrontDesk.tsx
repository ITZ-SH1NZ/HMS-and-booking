"use client";

import { useMemo, useState, useTransition } from "react";
import { mutate } from "swr";
import { motion } from "motion/react";
import { PlusIcon, SearchIcon, ChevronDownIcon } from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { Booking, BookingStatus, StaffPermission } from "@/lib/types";
import { Panel } from "@/components/manager/Panel";
import { NewBookingForm } from "./NewBookingForm";
import { checkInBooking, checkOutBooking, cancelHotelBooking } from "../actions";
import type { FrontDeskRoom } from "./types";

const TABS = ["today", "occupancy", "bookings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { today: "Today", occupancy: "Occupancy", bookings: "Bookings" };

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const todayStr = new Date().toISOString().slice(0, 10);
const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const guestLabel = (b: Booking) => b.guest_name || (b.source === "offline" ? "Walk-in" : "Online guest");

// A booking occupies room-nights if active on the given date.
const occupiesOn = (b: Booking, date: string) =>
  (b.status === "confirmed" || b.status === "checked_in") && b.check_in <= date && date < b.check_out;

export function FrontDesk({
  hotel,
  rooms,
  bookings,
  permissions,
  isManager,
}: {
  hotel: { id: string; name: string; location: string };
  rooms: FrontDeskRoom[];
  bookings: Booking[];
  permissions: StaffPermission[];
  isManager: boolean;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);

  const canBook = isManager || permissions.includes("offline_booking");
  const capacity = rooms.reduce((s, r) => s + r.total_units, 0);

  const summary = useMemo(() => {
    let arrivals = 0,
      departures = 0,
      inHouse = 0,
      occupied = 0;
    for (const b of bookings) {
      if (b.check_in === todayStr && b.status === "confirmed") arrivals += b.num_rooms;
      if (b.check_out === todayStr && b.status === "checked_in") departures += b.num_rooms;
      if (b.status === "checked_in" && b.check_in <= todayStr && todayStr < b.check_out) inHouse += b.num_rooms;
      if (occupiesOn(b, todayStr)) occupied += b.num_rooms;
    }
    const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
    return { arrivals, departures, inHouse, pct };
  }, [bookings, capacity]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{hotel.name}</h1>
          <p className="text-sm text-slate-500">{hotel.location}</p>
        </div>
        {canBook && (
          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" /> New booking
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Occupancy" value={`${summary.pct}%`} />
        <Stat label="Arrivals" value={summary.arrivals} accent="text-green-700" />
        <Stat label="Departures" value={summary.departures} accent="text-amber-700" />
        <Stat label="In-house" value={summary.inHouse} />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {TAB_LABELS[t]}
            {tab === t && <motion.span layoutId="fd-tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-5"
      >
        {tab === "today" && <TodayView bookings={bookings} onOpen={setDetail} />}
        {tab === "occupancy" && <OccupancyView rooms={rooms} bookings={bookings} />}
        {tab === "bookings" && <BookingsView bookings={bookings} onOpen={setDetail} />}
      </motion.div>

      <Panel open={newOpen} onClose={() => setNewOpen(false)} title="New offline booking">
        <NewBookingForm hotelId={hotel.id} rooms={rooms} onDone={() => setNewOpen(false)} />
      </Panel>

      <BookingDetail
        hotelId={hotel.id}
        booking={detail}
        rooms={rooms}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_STYLES[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

// ---- Today -----------------------------------------------------------------
function TodayView({ bookings, onOpen }: { bookings: Booking[]; onOpen: (b: Booking) => void }) {
  const arrivals = bookings.filter((b) => b.check_in === todayStr && b.status === "confirmed");
  const departures = bookings.filter((b) => b.check_out === todayStr && b.status === "checked_in");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Column title="Arrivals" count={arrivals.length}>
        {arrivals.length === 0 ? (
          <Empty>No arrivals due today.</Empty>
        ) : (
          arrivals.map((b) => <Row key={b.id} b={b} onOpen={onOpen} />)
        )}
      </Column>
      <Column title="Departures" count={departures.length}>
        {departures.length === 0 ? (
          <Empty>No departures due today.</Empty>
        ) : (
          departures.map((b) => <Row key={b.id} b={b} onOpen={onOpen} />)
        )}
      </Column>
    </div>
  );
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-slate-700">
        {title} <span className="text-slate-400">({count})</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ b, onOpen }: { b: Booking; onOpen: (b: Booking) => void }) {
  return (
    <button
      onClick={() => onOpen(b)}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-300"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{guestLabel(b)}</div>
        <div className="text-xs text-slate-500">
          {b.num_rooms} room{b.num_rooms > 1 ? "s" : ""} · {b.nights} night{b.nights > 1 ? "s" : ""}
        </div>
      </div>
      <StatusBadge status={b.status} />
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">{children}</p>;
}

// ---- Occupancy -------------------------------------------------------------
function OccupancyView({ rooms, bookings }: { rooms: FrontDeskRoom[]; bookings: Booking[] }) {
  const [date, setDate] = useState(todayStr);
  const [grid, setGrid] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const occupiedFor = (roomId: string, d: string) =>
    bookings.filter((b) => b.room_id === roomId && occupiesOn(b, d)).reduce((s, b) => s + b.num_rooms, 0);

  // 7-day window starting at the selected date.
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(`${date}T00:00:00`);
    dt.setDate(dt.getDate() + i);
    return dt.toISOString().slice(0, 10);
  });

  if (rooms.length === 0) return <Empty>No rooms configured for this hotel.</Empty>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setGrid((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {grid ? "Single-day view" : "7-day grid"}
        </button>
      </div>

      {grid ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-slate-500">Room type</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-2 text-center font-medium text-slate-500">{fmtDate(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-800">{r.name}</td>
                  {days.map((d) => {
                    const occ = occupiedFor(r.id, d);
                    const full = occ >= r.total_units;
                    return (
                      <td key={d} className="px-2 py-2 text-center">
                        <span className={full ? "font-bold text-brand-700" : "text-slate-600"}>
                          {occ}/{r.total_units}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => {
            const occ = occupiedFor(r.id, date);
            const pct = r.total_units > 0 ? (occ / r.total_units) * 100 : 0;
            const guests = bookings.filter((b) => b.room_id === r.id && occupiesOn(b, date));
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{r.name}</span>
                      <span className="text-sm font-semibold text-slate-700">{occ}/{r.total_units}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-2">
                    {guests.length === 0 ? (
                      <p className="py-1 text-sm text-slate-400">No guests in this room type on {fmtDate(date)}.</p>
                    ) : (
                      guests.map((b) => (
                        <div key={b.id} className="flex items-center justify-between py-1 text-sm">
                          <span className="text-slate-700">{guestLabel(b)}</span>
                          <span className="text-xs text-slate-400">until {fmtDate(b.check_out)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Bookings --------------------------------------------------------------
const STATUS_FILTERS: (BookingStatus | "all")[] = ["all", "confirmed", "checked_in", "completed", "cancelled", "pending"];

function BookingsView({ bookings, onOpen }: { bookings: Booking[]; onOpen: (b: Booking) => void }) {
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [q, setQ] = useState("");

  const filtered = bookings.filter((b) => {
    if (status !== "all" && b.status !== status) return false;
    if (q) {
      const hay = `${b.guest_name ?? ""} ${b.guest_phone ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All" : BOOKING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
          <SearchIcon className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guest…"
            className="w-full bg-transparent text-sm outline-none sm:w-40"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty>No bookings match.</Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Guest</th>
                  <th className="px-4 py-2 font-semibold">Stay</th>
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-4 py-2 font-semibold">Total</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} onClick={() => onOpen(b)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{guestLabel(b)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{fmtDate(b.check_in)} – {fmtDate(b.check_out)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${b.source === "offline" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                        {b.source === "offline" ? "Offline" : "Online"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{inr(b.total_price)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((b) => (
              <button key={b.id} onClick={() => onOpen(b)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{guestLabel(b)}</div>
                  <div className="text-xs text-slate-500">{fmtDate(b.check_in)} – {fmtDate(b.check_out)} · {inr(b.total_price)}</div>
                </div>
                <StatusBadge status={b.status} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Booking detail panel --------------------------------------------------
function BookingDetail({
  hotelId,
  booking,
  rooms,
  onClose,
}: {
  hotelId: string;
  booking: Booking | null;
  rooms: FrontDeskRoom[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!booking) return null;
  const room = rooms.find((r) => r.id === booking.room_id);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        await mutate(`/api/manager/manage/${hotelId}`);
        onClose();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  return (
    <Panel open={!!booking} onClose={onClose} title="Booking">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{guestLabel(booking)}</h3>
            <StatusBadge status={booking.status} />
          </div>
          {(booking.guest_phone || booking.guest_email) && (
            <p className="mt-0.5 text-sm text-slate-500">
              {[booking.guest_phone, booking.guest_email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
          <Line label="Room" value={room?.name ?? "—"} />
          <Line label="Stay" value={`${fmtDate(booking.check_in)} – ${fmtDate(booking.check_out)} (${booking.nights} night${booking.nights > 1 ? "s" : ""})`} />
          <Line label="Rooms / guests" value={`${booking.num_rooms} / ${booking.guest_count}`} />
          <Line label="Source" value={booking.source === "offline" ? "Offline" : "Online"} />
          <Line label="Total" value={inr(booking.total_price)} />
        </dl>

        {booking.special_requests && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Notes: </span>{booking.special_requests}
          </div>
        )}

        {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}

        <div className="space-y-2">
          {booking.status === "confirmed" && (
            <button
              onClick={() => run(() => checkInBooking(hotelId, booking.id))}
              disabled={pending}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Working…" : "Check in"}
            </button>
          )}
          {booking.status === "checked_in" && (
            <button
              onClick={() => run(() => checkOutBooking(hotelId, booking.id))}
              disabled={pending}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Working…" : "Check out"}
            </button>
          )}
          {(booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "pending") && (
            <button
              onClick={() => run(() => cancelHotelBooking(hotelId, booking.id, "Cancelled at front desk"))}
              disabled={pending}
              className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel booking
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
