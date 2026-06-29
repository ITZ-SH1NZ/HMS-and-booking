"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { mutate } from "swr";
import { motion } from "motion/react";
import { PlusIcon, SearchIcon, ChevronDownIcon } from "@/components/icons";
import { BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from "@/lib/booking";
import type { Booking, BookingStatus, StaffPermission } from "@/lib/types";
import { Panel } from "@/components/manager/Panel";
import { NewBookingForm } from "./NewBookingForm";
import { checkInBooking, checkOutBooking, cancelHotelBooking, confirmBookingPayment } from "../actions";
import type { FrontDeskRoom, FrontDeskBooking } from "./types";
import Link from "next/link";
import { QrCode, Camera, Keyboard } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const TABS = ["today", "occupancy", "bookings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { today: "Today", occupancy: "Occupancy", bookings: "Bookings" };

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Local calendar date (YYYY-MM-DD) — NOT UTC, so "today" matches the booking
// dates the way the user reads them.
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayStr = localDate();

const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const guestLabel = (b: FrontDeskBooking) => b.display_name || "Guest";

// A booking is "active" (holds a room) unless it's cancelled or completed —
// this includes pending (awaiting payment), so held rooms are tracked.
const isActive = (b: Booking) => b.status === "pending" || b.status === "confirmed" || b.status === "checked_in";

// Active stay that spans the given date (room is occupied that night).
const occupiesOn = (b: Booking, date: string) => isActive(b) && b.check_in <= date && date < b.check_out;
const isArrival = (b: Booking) => b.check_in === todayStr && isActive(b);
const isDeparture = (b: Booking) => b.check_out === todayStr && isActive(b);

// Camera QR Scanner Component
function CameraScanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError?: (err: any) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // ignore scan failures (common when QR is not in frame)
        }
      )
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        if (onError) onError(err);
      });

    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode
          .stop()
          .catch((err) => console.error("Failed to stop scanner:", err));
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto overflow-hidden rounded-2xl bg-black border border-slate-200">
      <div id="qr-reader" className="w-full h-full" />
      <div className="absolute inset-0 border-[3px] border-dashed border-brand-500/60 pointer-events-none rounded-2xl m-6 animate-pulse" />
    </div>
  );
}

export function FrontDesk({
  hotel,
  rooms,
  bookings,
  permissions,
  isManager,
}: {
  hotel: { id: string; name: string; location: string };
  rooms: FrontDeskRoom[];
  bookings: FrontDeskBooking[];
  permissions: StaffPermission[];
  isManager: boolean;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [newOpen, setNewOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalSearch, setPortalSearch] = useState("");
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detail, setDetail] = useState<FrontDeskBooking | null>(null);

  const canBook = isManager || permissions.includes("offline_booking");
  const capacity = rooms.reduce((s, r) => s + r.total_units, 0);

  const summary = useMemo(() => {
    let arrivals = 0,
      departures = 0,
      inHouse = 0,
      occupied = 0;
    for (const b of bookings) {
      if (isArrival(b)) arrivals += b.num_rooms;
      if (isDeparture(b)) departures += b.num_rooms;
      // In-house tonight = active stay spanning today (guests staying over).
      if (occupiesOn(b, todayStr)) {
        occupied += b.num_rooms;
        inHouse += b.guest_count;
      }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPortalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <QrCode className="h-4 w-4 text-slate-500" /> Check-In / Out
          </button>
          {canBook && (
            <button
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <PlusIcon className="h-4 w-4" /> New booking
            </button>
          )}
        </div>
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
      <Panel
        open={portalOpen}
        onClose={() => {
          setPortalOpen(false);
          setPortalSearch("");
          setPortalError(null);
          setIsScanning(false);
        }}
        title="Check-In / Out Portal"
      >
        <div className="space-y-4 py-4 text-left">
          {isScanning ? (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Point your camera at the guest's booking QR code.
              </p>
              
              <CameraScanner
                onScan={(decodedText) => {
                  setPortalError(null);
                  // Extract UUID from scanned URL
                  const match = decodedText.match(/bookings\/([a-f0-9-]{36})/i);
                  const bookingId = match ? match[1] : decodedText.trim();

                  const matched = bookings.find(
                    (b) =>
                      b.id.toLowerCase() === bookingId.toLowerCase() ||
                      b.id.replace(/-/g, "").toLowerCase() === bookingId.toLowerCase()
                  );

                  if (matched) {
                    setPortalOpen(false);
                    setIsScanning(false);
                    window.open(`/bookings/${matched.id}/check-in`, "_blank");
                  } else {
                    setPortalError("No active booking found for this scanned QR code.");
                  }
                }}
                onError={(err) => {
                  setPortalError("Could not access camera. Please type the ID manually.");
                  setIsScanning(false);
                }}
              />

              {portalError && (
                <p className="text-xs text-red-600 font-semibold">{portalError}</p>
              )}

              <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Keyboard className="h-4 w-4" /> Type Booking ID Instead
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan the guest's QR code or enter their Booking ID to launch the stay management portal.
              </p>

              <button
                type="button"
                onClick={() => {
                  setPortalError(null);
                  setIsScanning(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-50 border border-brand-200/50 py-3 text-sm font-bold text-brand-700 hover:bg-brand-100/60 transition mb-4"
              >
                <Camera className="h-5 w-5" /> Scan Guest QR Code
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-255/70"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">Or</span>
                <div className="flex-grow border-t border-slate-255/70"></div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPortalError(null);
                  const searchId = portalSearch.trim();
                  if (!searchId) return;

                  const matched = bookings.find(
                    (b) =>
                      b.id.toLowerCase().startsWith(searchId.toLowerCase()) ||
                      b.id.replace(/-/g, "").toLowerCase().startsWith(searchId.toLowerCase())
                  );

                  if (matched) {
                    setPortalOpen(false);
                    setPortalSearch("");
                    window.open(`/bookings/${matched.id}/check-in`, "_blank");
                  } else {
                    setPortalError("No active booking found with this ID for this hotel.");
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="portalBookingId" className="block text-[10px] font-black uppercase tracking-wider text-slate-450 mb-1">
                    Booking ID
                  </label>
                  <input
                    id="portalBookingId"
                    type="text"
                    value={portalSearch}
                    onChange={(e) => setPortalSearch(e.target.value)}
                    placeholder="e.g. DE7E6751"
                    className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    autoFocus
                  />
                </div>

                {portalError && (
                  <p className="text-xs text-red-600 font-semibold">{portalError}</p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition"
                >
                  Open Stay Portal
                </button>
              </form>
            </>
          )}
        </div>
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
function TodayView({ bookings, onOpen }: { bookings: FrontDeskBooking[]; onOpen: (b: FrontDeskBooking) => void }) {
  const arrivals = bookings.filter(isArrival);
  const departures = bookings.filter(isDeparture);

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

function Row({ b, onOpen }: { b: FrontDeskBooking; onOpen: (b: FrontDeskBooking) => void }) {
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
function OccupancyView({ rooms, bookings }: { rooms: FrontDeskRoom[]; bookings: FrontDeskBooking[] }) {
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

type SortKey = "checkin_desc" | "checkin_asc" | "total_desc" | "total_asc";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "checkin_desc", label: "Check-in: newest" },
  { key: "checkin_asc", label: "Check-in: oldest" },
  { key: "total_desc", label: "Total: high → low" },
  { key: "total_asc", label: "Total: low → high" },
];

function BookingsView({ bookings, onOpen }: { bookings: FrontDeskBooking[]; onOpen: (b: FrontDeskBooking) => void }) {
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("checkin_desc");

  const filtered = bookings
    .filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (q) {
        const hay = `${b.display_name ?? ""} ${b.display_phone ?? ""} ${b.guest_email ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "checkin_asc":
          return a.check_in.localeCompare(b.check_in);
        case "total_desc":
          return b.total_price - a.total_price;
        case "total_asc":
          return a.total_price - b.total_price;
        default:
          return b.check_in.localeCompare(a.check_in);
      }
    });

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <SearchIcon className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, email…"
              className="w-full bg-transparent text-sm outline-none sm:w-56"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
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
  booking: FrontDeskBooking | null;
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
          {(booking.display_phone || booking.guest_email) && (
            <p className="mt-0.5 text-sm text-slate-500">
              {[booking.display_phone, booking.guest_email].filter(Boolean).join(" · ")}
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
          {booking.status !== "completed" && booking.status !== "cancelled" && (
            <Link
              href={`/bookings/${booking.id}/check-in`}
              target="_blank"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition mb-3"
            >
              <QrCode className="h-4 w-4 text-slate-400" /> Open Stay Portal
            </Link>
          )}
          {booking.status === "pending" && (
            <button
              onClick={() => run(() => confirmBookingPayment(hotelId, booking.id))}
              disabled={pending}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Working…" : "Mark as paid · Confirm"}
            </button>
          )}
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
