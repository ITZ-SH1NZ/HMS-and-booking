"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RangeCalendar } from "@/components/RangeCalendar";
import { CalendarIcon, ArrowRightIcon } from "@/components/icons";

const longDate = (s: string) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Select date";
const weekday = (s: string) =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" }) : "";

// Two date cards that open a shared range calendar popover.
export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<"in" | "out">("in");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function pick(date: string) {
    if (!checkIn || (checkIn && checkOut) || date < checkIn) {
      onChange(date, "");
      setFocus("out");
    } else {
      onChange(checkIn, date);
      setOpen(false);
      setFocus("in");
    }
  }

  function openAt(which: "in" | "out") {
    setFocus(which);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Card
          label="Check-in"
          value={checkIn}
          active={open && focus === "in"}
          onClick={() => openAt("in")}
        />
        <ArrowRightIcon className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
        <Card
          label="Check-out"
          value={checkOut}
          active={open && focus === "out"}
          onClick={() => openAt("out")}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 top-full z-30 mt-3 w-[92vw] max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <RangeCalendar checkIn={checkIn} checkOut={checkOut} onPick={pick} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-xl border p-4 text-left transition ${
        active ? "border-rose-500 ring-1 ring-rose-200" : "border-slate-200 hover:border-rose-300"
      }`}
    >
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-lg font-bold text-slate-900">{longDate(value)}</p>
      <p className="text-xs text-slate-400">{weekday(value) || " "}</p>
      <CalendarIcon className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
    </button>
  );
}
