"use client";

import { useMemo, useState, useTransition } from "react";
import { mutate } from "swr";
import { createOfflineBooking } from "../actions";
import type { FrontDeskRoom } from "./types";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
  return d > 0 ? Math.round(d) : 0;
}

const todayStr = new Date().toISOString().slice(0, 10);

export function NewBookingForm({
  hotelId,
  rooms,
  onDone,
}: {
  hotelId: string;
  rooms: FrontDeskRoom[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState("");
  const [numRooms, setNumRooms] = useState(1);
  const [guests, setGuests] = useState(2);
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [paid, setPaid] = useState(true);
  const [special, setSpecial] = useState("");

  const room = rooms.find((r) => r.id === roomId) ?? null;
  const nights = nightsBetween(checkIn, checkOut);
  const quote = useMemo(() => {
    if (!room || nights <= 0) return null;
    const base = room.price * numRooms * nights;
    const gst = Math.round(base * 0.18 * 100) / 100;
    return { base, gst, total: base + gst };
  }, [room, nights, numRooms]);

  const valid = guestName.trim() && roomId && nights > 0 && numRooms >= 1;

  function submit() {
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      const res = await createOfflineBooking({
        hotelId,
        roomId,
        checkIn,
        checkOut,
        guests,
        numRooms,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        method,
        paid,
        special: special.trim() || undefined,
      });
      if (res.ok) {
        await mutate(`/api/manager/manage/${hotelId}`);
        onDone();
      } else {
        setError(res.error ?? "Failed to create booking.");
      }
    });
  }

  if (rooms.length === 0) {
    return <p className="text-sm text-slate-500">This hotel has no rooms yet. Add rooms before taking bookings.</p>;
  }

  return (
    <div className="space-y-4">
      <Field label="Guest name" required>
        <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputCls} placeholder="Full name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputCls} placeholder="Optional" />
        </Field>
        <Field label="Email">
          <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputCls} placeholder="Optional" />
        </Field>
      </div>

      <Field label="Room type" required>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputCls}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {inr(r.price)}/night ({r.total_units} units)
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in" required>
          <input type="date" min={todayStr} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Check-out" required>
          <input type="date" min={checkIn || todayStr} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rooms">
          <input type="number" min={1} value={numRooms} onChange={(e) => setNumRooms(Math.max(1, Number(e.target.value)))} className={inputCls} />
        </Field>
        <Field label="Guests">
          <input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))} className={inputCls} />
        </Field>
      </div>

      <Field label="Payment">
        <div className="flex gap-2">
          {(["cash", "upi", "card"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                method === m ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Mark as paid now
      </label>

      <Field label="Notes">
        <textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={2} className={inputCls} placeholder="Special requests (optional)" />
      </Field>

      {quote && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{inr(room!.price)} × {numRooms} room{numRooms > 1 ? "s" : ""} × {nights} night{nights > 1 ? "s" : ""}</span>
            <span>{inr(quote.base)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>GST (18%)</span>
            <span>{inr(quote.gst)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
            <span>Total</span>
            <span>{inr(quote.total)}</span>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}

      <button
        onClick={submit}
        disabled={!valid || pending}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Confirm booking"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-brand-600">*</span>}
      </span>
      {children}
    </label>
  );
}
