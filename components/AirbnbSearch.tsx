"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SearchIcon,
  MapPinIcon,
  CalendarIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/icons";
import { RangeCalendar } from "@/components/RangeCalendar";
import { ymd } from "@/lib/booking";

type Segment = "where" | "when" | "who" | null;
type WhenMode = "dates" | "flexible";

interface Guests {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

const NIGHTS: Record<string, number> = { weekend: 2, week: 7, month: 30 };

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

  // Sliding / scaling highlight behind the active segment.
  const [hl, setHl] = useState({ left: 0, width: 0 });
  const [slide, setSlide] = useState(false);
  const prevActive = useRef<Segment>(null);

  useEffect(() => {
    // Measure the active segment so the highlight can track it (DOM sync).
    function measure() {
      const el = active ? segEls.current[active] : null;
      if (el) setHl({ left: el.offsetLeft, width: el.offsetWidth });
    }
    if (active !== null) {
      // Jump (no slide) when opening from idle; spring-slide when switching.
      setSlide(prevActive.current !== null);
      measure();
    }
    prevActive.current = active;

    // The search button expands on open, reflowing the segments — re-measure
    // continuously until the layout settles so the highlight tracks correctly.
    const ro = new ResizeObserver(measure);
    Object.values(segEls.current).forEach((el) => el && ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
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
      setActive("who");
    }
  }

  function setRange(start: string, nights: number) {
    const d = new Date(`${start}T00:00:00`);
    d.setDate(d.getDate() + nights);
    setCheckIn(start);
    setCheckOut(ymd(d));
    setActive("who");
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
        <motion.div
          className="pointer-events-none absolute rounded-full bg-white shadow-md"
          style={{ top: 4, bottom: 4 }}
          animate={{
            left: hl.left,
            width: hl.width,
            opacity: expanded ? 1 : 0,
            scale: expanded ? 1 : 0.96,
          }}
          transition={{
            left: slide ? { type: "spring", stiffness: 600, damping: 48 } : { duration: 0 },
            width: slide ? { type: "spring", stiffness: 600, damping: 48 } : { duration: 0 },
            opacity: { duration: 0.18, ease: "easeOut" },
            scale: { duration: 0.18, ease: "easeOut" },
          }}
        />

        <SegmentItem
          innerRef={(el) => {
            segEls.current.where = el;
          }}
          label="Where"
          active={active === "where"}
          expanded={expanded}
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
          active={active === "when"}
          expanded={expanded}
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
          active={active === "who"}
          expanded={expanded}
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
      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            className={`absolute inset-x-0 top-full z-50 mt-3 flex ${
              active === "who"
                ? "justify-end"
                : active === "when"
                  ? "justify-center"
                  : "justify-start"
            }`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top" }}
          >
            <div
              className={`w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl ${
                active === "where"
                  ? "max-w-md"
                  : active === "when"
                    ? "max-w-2xl"
                    : "max-w-sm"
              }`}
            >
              {active === "where" && (
                <>
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
                          location
                            ? s.toLowerCase().includes(location.toLowerCase())
                            : true,
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
                              <span className="text-sm font-medium text-slate-800">
                                {s}
                              </span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}

              {active === "when" && (
                <WhenPanel
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onPick={pickDate}
                  onFlexRange={setRange}
                />
              )}

              {active === "who" && (
                <>
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SegmentItem({
  label,
  active,
  expanded,
  onActivate,
  innerRef,
  children,
}: {
  label: string;
  active: boolean;
  expanded: boolean;
  onActivate: () => void;
  innerRef: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const hover = active
    ? ""
    : expanded
      ? "hover:bg-slate-200/70"
      : "hover:bg-slate-100";
  return (
    <div
      ref={innerRef}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      className={`relative z-10 flex flex-1 cursor-pointer flex-col rounded-full px-6 py-3 text-left transition-colors duration-200 ${hover}`}
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

function WhenPanel({
  checkIn,
  checkOut,
  onPick,
  onFlexRange,
}: {
  checkIn: string;
  checkOut: string;
  onPick: (date: string) => void;
  onFlexRange: (start: string, nights: number) => void;
}) {
  const [mode, setMode] = useState<WhenMode>("dates");
  const [duration, setDuration] = useState<keyof typeof NIGHTS>("weekend");

  return (
    <div>
      <div className="mx-auto mb-5 flex w-fit items-center rounded-full bg-slate-100 p-1">
        {(["dates", "flexible"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="relative rounded-full px-6 py-2 text-sm font-semibold"
          >
            {mode === m && (
              <motion.span
                layoutId="when-tab"
                className="absolute inset-0 rounded-full bg-white shadow"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                mode === m ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {m === "dates" ? "Dates" : "Flexible"}
            </span>
          </button>
        ))}
      </div>

      <motion.div layout transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {mode === "dates" ? (
              <RangeCalendar checkIn={checkIn} checkOut={checkOut} onPick={onPick} />
            ) : (
              <FlexiblePanel
                duration={duration}
                setDuration={setDuration}
                onPickMonth={(start) => onFlexRange(start, NIGHTS[duration])}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function FlexiblePanel({
  duration,
  setDuration,
  onPickMonth,
}: {
  duration: keyof typeof NIGHTS;
  setDuration: (d: keyof typeof NIGHTS) => void;
  onPickMonth: (start: string) => void;
}) {
  const today = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return d;
  });

  return (
    <div className="text-center">
      <p className="mb-3 text-lg font-semibold text-slate-800">
        How long would you like to stay?
      </p>
      <div className="mb-8 flex justify-center gap-3">
        {(["weekend", "week", "month"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            className={`rounded-full border px-5 py-2 text-sm font-medium capitalize transition ${
              duration === d
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:border-slate-500"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <p className="mb-3 text-lg font-semibold text-slate-800">
        When do you want to go?
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {months.map((d) => {
          const start = ymd(d < today ? today : d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPickMonth(start)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 px-2 py-4 text-slate-700 transition hover:border-slate-900"
            >
              <CalendarIcon className="h-6 w-6 text-slate-500" />
              <span className="text-sm font-medium">
                {d.toLocaleDateString(undefined, { month: "long" })}
              </span>
              <span className="text-xs text-slate-400">{d.getFullYear()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
