"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SearchIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/icons";

type Segment = "where" | "when" | "who" | null;

interface Guests {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const fmt = (s: string) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

export function AirbnbSearch() {
  const router = useRouter();
  const [active, setActive] = useState<Segment>(null);
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<Guests>({
    adults: 0,
    children: 0,
    infants: 0,
    pets: 0,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);
  const segEls = useRef<Record<string, HTMLDivElement | null>>({});

  // Sliding highlight geometry (keeps last position when closing so it can
  // slide back out smoothly).
  const [hl, setHl] = useState({ left: 0, width: 0, visible: false });

  useEffect(() => {
    function measure() {
      const el = active ? segEls.current[active] : null;
      if (el) setHl({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
      else setHl((h) => ({ ...h, visible: false }));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  // Real destination suggestions from approved hotels.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("hotels")
        .select("location")
        .eq("status", "approved");
      const locs = Array.from(
        new Set((data ?? []).map((r) => r.location).filter(Boolean)),
      ) as string[];
      setSuggestions(locs.slice(0, 6));
    })();
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (active === "where") whereInputRef.current?.focus();
  }, [active]);

  const guestCount = guests.adults + guests.children;
  const dateLabel =
    checkIn && checkOut
      ? `${fmt(checkIn)} – ${fmt(checkOut)}`
      : checkIn
        ? fmt(checkIn)
        : "";
  const guestLabel =
    guestCount > 0 ? `${guestCount} guest${guestCount > 1 ? "s" : ""}` : "";

  function pickDate(date: string) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut("");
    } else if (date < checkIn) {
      setCheckIn(date);
    } else {
      setCheckOut(date);
    }
  }

  function submit() {
    const q = new URLSearchParams();
    if (location) q.set("location", location);
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (guestCount) q.set("guests", String(guestCount));
    setActive(null);
    router.push(`/?${q.toString()}#hotels`);
  }

  const expanded = active !== null;

  return (
    <div ref={rootRef} className="relative w-full max-w-3xl">
      <div
        className={`relative flex items-center rounded-full border shadow-lg transition-colors duration-300 ${
          expanded ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-white"
        }`}
      >
        {/* Sliding highlight */}
        <div
          className="pointer-events-none absolute rounded-full bg-white shadow-md transition-all duration-300 ease-out"
          style={{
            left: hl.left,
            width: hl.width,
            top: 4,
            bottom: 4,
            opacity: hl.visible ? 1 : 0,
          }}
        />

        <SegmentItem
          innerRef={(el) => {
            segEls.current.where = el;
          }}
          label="Where"
          onActivate={() => setActive("where")}
        >
          <input
            ref={whereInputRef}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={() => setActive("where")}
            placeholder="Search destinations"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </SegmentItem>

        <Divider hidden={expanded} />

        <SegmentItem
          innerRef={(el) => {
            segEls.current.when = el;
          }}
          label="When"
          onActivate={() => setActive("when")}
        >
          <span className={`text-sm ${dateLabel ? "text-slate-700" : "text-slate-400"}`}>
            {dateLabel || "Add dates"}
          </span>
        </SegmentItem>

        <Divider hidden={expanded} />

        <SegmentItem
          innerRef={(el) => {
            segEls.current.who = el;
          }}
          label="Who"
          onActivate={() => setActive("who")}
        >
          <span className={`text-sm ${guestLabel ? "text-slate-700" : "text-slate-400"}`}>
            {guestLabel || "Add guests"}
          </span>
        </SegmentItem>

        <button
          type="button"
          onClick={submit}
          aria-label="Search"
          className={`relative z-10 my-2 mr-2 flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-rose-600 text-white transition-all duration-300 ease-out hover:bg-rose-700 ${
            expanded ? "w-auto px-5" : "w-12"
          }`}
        >
          <SearchIcon className="h-5 w-5" />
          {expanded && <span className="font-semibold">Search</span>}
        </button>
      </div>

      {/* Popovers */}
      {active === "where" && (
        <Panel className="left-0 w-full max-w-md">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Suggested destinations
          </p>
          {suggestions.length === 0 ? (
            <p className="px-1 py-4 text-sm text-slate-400">
              Type a destination above.
            </p>
          ) : (
            <ul className="space-y-1">
              {suggestions
                .filter((s) =>
                  location ? s.toLowerCase().includes(location.toLowerCase()) : true,
                )
                .map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setLocation(s);
                        setActive("when");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                        <MapPinIcon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-medium text-slate-800">{s}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      )}

      {active === "when" && (
        <Panel className="left-1/2 w-[90vw] max-w-2xl -translate-x-1/2">
          <RangeCalendar checkIn={checkIn} checkOut={checkOut} onPick={pickDate} />
        </Panel>
      )}

      {active === "who" && (
        <Panel className="right-0 w-full max-w-sm">
          <GuestRow
            label="Adults"
            sub="Ages 13 or above"
            value={guests.adults}
            onChange={(v) => setGuests((g) => ({ ...g, adults: v }))}
          />
          <GuestRow
            label="Children"
            sub="Ages 2–12"
            value={guests.children}
            onChange={(v) => setGuests((g) => ({ ...g, children: v }))}
          />
          <GuestRow
            label="Infants"
            sub="Under 2"
            value={guests.infants}
            onChange={(v) => setGuests((g) => ({ ...g, infants: v }))}
          />
          <GuestRow
            label="Pets"
            sub="Service animals welcome"
            value={guests.pets}
            onChange={(v) => setGuests((g) => ({ ...g, pets: v }))}
            last
          />
        </Panel>
      )}
    </div>
  );
}

function SegmentItem({
  label,
  onActivate,
  innerRef,
  children,
}: {
  label: string;
  onActivate: () => void;
  innerRef: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      role="button"
      tabIndex={0}
      onMouseEnter={onActivate}
      onClick={onActivate}
      className="relative z-10 flex flex-1 cursor-pointer flex-col rounded-full px-6 py-3 text-left"
    >
      <span className="text-xs font-semibold text-slate-800">{label}</span>
      {children}
    </div>
  );
}

function Divider({ hidden }: { hidden: boolean }) {
  return (
    <span
      className={`relative z-10 h-8 w-px bg-slate-200 transition-opacity duration-200 ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
    />
  );
}

function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`absolute top-full z-50 mt-3 ${className ?? ""}`}>
      <div className="animate-pop-in w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function GuestRow({
  label,
  sub,
  value,
  onChange,
  last,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-4 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <div>
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <Stepper
          aria-label={`Decrease ${label}`}
          disabled={value === 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <MinusIcon className="h-4 w-4" />
        </Stepper>
        <span className="w-5 text-center text-sm font-medium text-slate-800">
          {value}
        </span>
        <Stepper aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)}>
          <PlusIcon className="h-4 w-4" />
        </Stepper>
      </div>
    </div>
  );
}

function Stepper({
  children,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-600 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}

function RangeCalendar({
  checkIn,
  checkOut,
  onPick,
}: {
  checkIn: string;
  checkOut: string;
  onPick: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [offset, setOffset] = useState(0);

  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const next = new Date(today.getFullYear(), today.getMonth() + offset + 1, 1);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOffset((o) => Math.max(0, o - 1))}
        disabled={offset === 0}
        className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30"
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setOffset((o) => o + 1)}
        className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full transition hover:bg-slate-100"
        aria-label="Next month"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
      <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2">
        <Month date={base} today={today} checkIn={checkIn} checkOut={checkOut} onPick={onPick} />
        <div className="hidden sm:block">
          <Month date={next} today={today} checkIn={checkIn} checkOut={checkOut} onPick={onPick} />
        </div>
      </div>
    </div>
  );
}

function Month({
  date,
  today,
  checkIn,
  checkOut,
  onPick,
}: {
  date: Date;
  today: Date;
  checkIn: string;
  checkOut: string;
  onPick: (date: string) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      <p className="mb-3 text-center text-sm font-semibold text-slate-800">
        {date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="mb-1 grid grid-cols-7 text-center text-xs text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (!cell) return <span key={i} />;
          const s = ymd(cell);
          const past = cell < today;
          const isStart = s === checkIn;
          const isEnd = s === checkOut;
          const inRange = checkIn && checkOut && s > checkIn && s < checkOut;
          return (
            <div key={i} className="flex justify-center">
              <button
                type="button"
                disabled={past}
                onClick={() => onPick(s)}
                className={`grid h-9 w-9 place-items-center rounded-full text-sm transition ${
                  isStart || isEnd
                    ? "bg-rose-600 font-semibold text-white"
                    : inRange
                      ? "bg-rose-50 text-rose-700"
                      : past
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {cell.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
