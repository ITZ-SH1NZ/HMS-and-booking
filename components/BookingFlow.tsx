"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Price } from "@/components/Price";
import { UpiPayment } from "@/components/UpiPayment";
import { BookingStepper } from "@/components/BookingStepper";
import { BookingSummary } from "@/components/BookingSummary";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  PlusIcon,
  MinusIcon,
  ShieldIcon,
  BoltIcon,
  LockIcon,
  CheckCircleIcon,
  PencilIcon,
  GoogleIcon,
  BuildingIcon,
} from "@/components/icons";
import { nightsBetween, computeQuote } from "@/lib/booking";
import type { AvailabilityResult } from "@/lib/types";

interface HotelLite {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
}
interface RoomLite {
  id: string;
  name: string;
  price: number;
  capacity: number;
  amenities: string[];
}

const todayStr = () => new Date().toISOString().split("T")[0];
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};
export function BookingFlow({
  hotel,
  rooms,
  rating,
  reviewCount,
  guest,
}: {
  hotel: HotelLite;
  rooms: RoomLite[];
  rating: number | null;
  reviewCount: number;
  guest: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);

  const [checkIn, setCheckIn] = useState(todayStr());
  const [checkOut, setCheckOut] = useState(addDays(todayStr(), 1));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [numRooms, setNumRooms] = useState(1);

  const [availability, setAvailability] = useState<AvailabilityResult[] | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");

  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email);
  const [phone, setPhone] = useState(guest.phone);
  const [terms, setTerms] = useState(false);

  const [bookingId, setBookingId] = useState("");
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guests = adults + children;
  const nights = nightsBetween(checkIn, checkOut);
  const minPrice = rooms.length ? Math.min(...rooms.map((r) => r.price)) : null;

  const selectedAvail = availability?.find((r) => r.room_id === roomId) ?? null;
  const selectedRoom =
    selectedAvail ?? rooms.find((r) => r.id === roomId) ?? null;
  const selectedPrice = selectedRoom?.price ?? null;
  const quote = selectedRoom
    ? computeQuote(selectedRoom.price, nights, numRooms)
    : null;

  function goTo(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  async function continueToRooms() {
    if (nights < 1) {
      setAvailError("Check-out must be after check-in.");
      return;
    }
    setLoadingAvail(true);
    setAvailError(null);
    try {
      const res = await fetch(
        `/api/availability?hotelId=${hotel.id}&checkIn=${checkIn}&checkOut=${checkOut}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not check availability");
      setAvailability(json.rooms as AvailabilityResult[]);
      goTo(2);
    } catch (e) {
      setAvailError(e instanceof Error ? e.message : "Could not check availability");
    } finally {
      setLoadingAvail(false);
    }
  }

  async function pay() {
    if (!terms) {
      setError("Please accept the terms & cancellation policy.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          checkIn,
          checkOut,
          guestCount: guests,
          numRooms,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push(`/login?redirect=/hotels/${hotel.id}/book`);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Could not create booking");
      setBookingId(json.bookingId);
      setPaying(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href={`/hotels/${hotel.id}`}
        className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </Link>

      <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Book your stay</h1>
          <p className="text-sm text-slate-500">
            {step === 1
              ? "Enter your stay details to check availability"
              : step === 2
                ? "Choose your room"
                : "Almost there! Confirm your details and pay."}
          </p>
        </div>
        <div className="w-full max-w-md lg:max-w-lg">
          <BookingStepper current={step} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 1 && (
                <StayDetails
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onDatesChange={(ci, co) => {
                    setCheckIn(ci);
                    setCheckOut(co);
                  }}
                  nights={nights}
                  adults={adults}
                  setAdults={setAdults}
                  childrenCount={children}
                  setChildren={setChildren}
                  numRooms={numRooms}
                  setNumRooms={setNumRooms}
                  loading={loadingAvail}
                  error={availError}
                  onContinue={continueToRooms}
                />
              )}

              {step === 2 && (
                <RoomSelection
                  hotel={hotel}
                  rooms={availability ?? []}
                  numRooms={numRooms}
                  roomId={roomId}
                  setRoomId={setRoomId}
                  summary={`${nights} night${nights === 1 ? "" : "s"} · ${longShort(checkIn)} – ${longShort(checkOut)} · ${numRooms} Room${numRooms === 1 ? "" : "s"}, ${guests} Guest${guests === 1 ? "" : "s"}`}
                  onModify={() => goTo(1)}
                  onBack={() => goTo(1)}
                  onContinue={() => goTo(3)}
                />
              )}

              {step === 3 &&
                (paying && bookingId && quote ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircleIcon className="h-5 w-5" /> Room reserved — complete
                      payment to confirm.
                    </div>
                    <UpiPayment
                      bookingId={bookingId}
                      totalBase={quote.total}
                      onPaid={() => router.push(`/bookings/${bookingId}/success`)}
                    />
                  </div>
                ) : (
                  <Payment
                    name={name}
                    setName={setName}
                    email={email}
                    setEmail={setEmail}
                    phone={phone}
                    setPhone={setPhone}
                    terms={terms}
                    setTerms={setTerms}
                    total={quote?.total ?? 0}
                    error={error}
                    submitting={submitting}
                    onBack={() => goTo(2)}
                    onPay={pay}
                  />
                ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24">
          <BookingSummary
            hotel={hotel}
            rating={rating}
            reviewCount={reviewCount}
            pricePerNight={selectedPrice ?? minPrice}
            roomName={selectedRoom?.name}
            stay={{ checkIn, checkOut, guests, rooms: numRooms, nights }}
            quote={quote}
            onEdit={() => goTo(1)}
          />
        </div>
      </div>
    </div>
  );
}

const longShort = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

// ---------------------------------------------------------------------------
// Step 1
// ---------------------------------------------------------------------------
function StayDetails(props: {
  checkIn: string;
  checkOut: string;
  onDatesChange: (checkIn: string, checkOut: string) => void;
  nights: number;
  adults: number;
  setAdults: (v: number) => void;
  childrenCount: number;
  setChildren: (v: number) => void;
  numRooms: number;
  setNumRooms: (v: number) => void;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <SectionTitle icon={<CalendarIcon className="h-5 w-5" />}>
        When are you staying?
      </SectionTitle>
      <div className="mt-4">
        <DateRangePicker
          checkIn={props.checkIn}
          checkOut={props.checkOut}
          onChange={props.onDatesChange}
        />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
        <BoltIcon className="h-4 w-4" /> {props.nights} Night
        {props.nights === 1 ? "" : "s"} Stay
      </div>

      <div className="my-6 border-t border-slate-100" />

      <SectionTitle icon={<UsersIcon className="h-5 w-5" />}>
        Who&apos;s coming?
      </SectionTitle>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CounterCard
          label="Adults"
          sub="Ages 13 or above"
          value={props.adults}
          min={1}
          onChange={props.setAdults}
        />
        <CounterCard
          label="Children"
          sub="Ages 2 – 12"
          value={props.childrenCount}
          min={0}
          onChange={props.setChildren}
        />
        <CounterCard
          label="Rooms"
          sub="Separate rooms"
          value={props.numRooms}
          min={1}
          onChange={props.setNumRooms}
        />
      </div>

      {props.error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {props.error}
        </div>
      )}

      <div className="mt-6 flex flex-col items-stretch gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-xs">
          <Trust icon={<ShieldIcon className="h-4 w-4" />} title="Free cancellation" sub="Before 24 hrs" />
          <Trust icon={<BoltIcon className="h-4 w-4" />} title="Instant confirmation" sub="Get booked instantly" />
          <Trust icon={<LockIcon className="h-4 w-4" />} title="Secure payments" sub="100% protected" />
        </div>
        <button
          onClick={props.onContinue}
          disabled={props.loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {props.loading ? "Checking…" : "Continue"}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2
// ---------------------------------------------------------------------------
function RoomSelection(props: {
  hotel: HotelLite;
  rooms: AvailabilityResult[];
  numRooms: number;
  roomId: string;
  setRoomId: (id: string) => void;
  summary: string;
  onModify: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Select a room</h2>
          <p className="text-xs text-slate-500">{props.summary}</p>
        </div>
        <button
          onClick={props.onModify}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Modify search
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {props.rooms.length === 0 && (
          <p className="text-sm text-slate-500">No rooms in this hotel yet.</p>
        )}
        {props.rooms.map((room) => {
          const enough = room.available >= props.numRooms;
          const selected = props.roomId === room.room_id;
          return (
            <button
              key={room.room_id}
              type="button"
              disabled={!enough}
              onClick={() => props.setRoomId(room.room_id)}
              className={`flex w-full gap-4 rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-rose-500 ring-1 ring-rose-200"
                  : "border-slate-200 hover:border-slate-300"
              } ${enough ? "" : "opacity-60"}`}
            >
              <span
                className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  selected ? "border-rose-600" : "border-slate-300"
                }`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />}
              </span>
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {props.hotel.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={props.hotel.image_url}
                    alt={room.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-slate-300">
                    <BuildingIcon className="h-7 w-7" />
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{room.name}</p>
                  <div className="text-right">
                    <Price amount={room.price} className="font-bold text-slate-900" />
                    <span className="block text-xs text-slate-400">/ night · taxes incl.</span>
                  </div>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <UsersIcon className="h-4 w-4" /> Sleeps {room.capacity}
                </p>
                {room.amenities?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 4).map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{room.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                )}
                <p
                  className={`mt-auto pt-2 text-sm font-medium ${
                    enough ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {enough
                    ? `${room.available} room${room.available === 1 ? "" : "s"} available`
                    : room.available <= 0
                      ? "Sold out"
                      : `Only ${room.available} left (need ${props.numRooms})`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          onClick={props.onBack}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </button>
        <button
          onClick={props.onContinue}
          disabled={!props.roomId}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Continue to payment <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3
// ---------------------------------------------------------------------------
function Payment(props: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  terms: boolean;
  setTerms: (v: boolean) => void;
  total: number;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onPay: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <SectionTitle icon={<UserIcon className="h-5 w-5" />}>Guest details</SectionTitle>
      <p className="text-xs text-slate-500">Who will be checking in?</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Labeled label="Full name">
          <input className={input} value={props.name} onChange={(e) => props.setName(e.target.value)} />
        </Labeled>
        <Labeled label="Email address">
          <input type="email" className={input} value={props.email} onChange={(e) => props.setEmail(e.target.value)} />
        </Labeled>
        <Labeled label="Phone number">
          <input type="tel" className={input} value={props.phone} onChange={(e) => props.setPhone(e.target.value)} />
        </Labeled>
      </div>

      <div className="my-6 border-t border-slate-100" />

      <SectionTitle icon={<LockIcon className="h-5 w-5" />}>Payment method</SectionTitle>
      <p className="text-xs text-slate-500">Pay securely via UPI — scan a QR with any UPI app.</p>
      <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-rose-500 bg-rose-50/40 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white shadow-sm">
          <GoogleIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">UPI</p>
          <p className="text-xs text-slate-500">GPay, PhonePe, Paytm &amp; more</p>
        </div>
        <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-white">
          <CheckCircleIcon className="h-4 w-4" />
        </span>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={props.terms}
          onChange={(e) => props.setTerms(e.target.checked)}
          className="mt-0.5 accent-rose-600"
        />
        I agree to the booking{" "}
        <span className="font-semibold text-rose-600">terms and cancellation policy</span>.
      </label>

      {props.error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {props.error}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          onClick={props.onBack}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={props.onPay}
          disabled={props.submitting}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <LockIcon className="h-4 w-4" /> Pay <Price amount={props.total} />
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="text-rose-500">{icon}</span>
      {children}
    </h2>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function CounterCard({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
      <div className="mt-3 flex items-center justify-between">
        <CircleBtn disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
          <MinusIcon className="h-4 w-4" />
        </CircleBtn>
        <span className="text-lg font-bold text-slate-900">{value}</span>
        <CircleBtn onClick={() => onChange(value + 1)}>
          <PlusIcon className="h-4 w-4" />
        </CircleBtn>
      </div>
    </div>
  );
}

function CircleBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Trust({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        {icon}
      </span>
      <span>
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="block text-slate-400">{sub}</span>
      </span>
    </div>
  );
}
