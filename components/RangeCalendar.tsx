"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ymd } from "@/lib/booking";

// Airbnb-style range calendar: connected highlight, hover preview, past dates
// disabled. Presentational — the parent owns checkIn/checkOut and pickDate.
export function RangeCalendar({
  checkIn,
  checkOut,
  onPick,
  months = 2,
}: {
  checkIn: string;
  checkOut: string;
  onPick: (date: string) => void;
  months?: number;
}) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState("");

  const previewEnd = checkIn && !checkOut && hover > checkIn ? hover : "";
  const effEnd = checkOut || previewEnd;

  const monthDates = Array.from({ length: months }).map(
    (_, i) => new Date(today.getFullYear(), today.getMonth() + offset + i, 1, 12, 0, 0),
  );

  return (
    <div className="relative" onMouseLeave={() => setHover("")}>
      <button
        type="button"
        onClick={() => setOffset((o) => Math.max(0, o - 1))}
        disabled={offset === 0}
        className="absolute left-1 top-0 grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30"
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setOffset((o) => o + 1)}
        className="absolute right-1 top-0 grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100"
        aria-label="Next month"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
      <div
        className={`grid grid-cols-1 gap-8 ${months > 1 ? "sm:grid-cols-2" : ""}`}
      >
        {monthDates.map((d, i) => (
          <div key={d.toISOString()} className={i > 0 ? "hidden sm:block" : ""}>
            <Month
              date={d}
              today={today}
              checkIn={checkIn}
              effEnd={effEnd}
              onPick={onPick}
              onHover={setHover}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Month({
  date,
  today,
  checkIn,
  effEnd,
  onPick,
  onHover,
}: {
  date: Date;
  today: Date;
  checkIn: string;
  effEnd: string;
  onPick: (date: string) => void;
  onHover: (date: string) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDow = new Date(year, month, 1, 12, 0, 0).getDay();
  const daysIn = new Date(year, month + 1, 0, 12, 0, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(year, month, d, 12, 0, 0));

  return (
    <div>
      <p className="mb-4 text-center text-sm font-semibold text-slate-800">
        {date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </p>
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="h-11" />;
          const s = ymd(cell);
          const past = cell < today;
          const isStart = s === checkIn;
          const isEnd = s === effEnd;
          const inRange = checkIn && effEnd && s > checkIn && s < effEnd;
          const endpoint = isStart || isEnd;

          let bar = "";
          if (inRange) bar = "left-0 right-0";
          else if (isStart && effEnd && !isEnd) bar = "left-1/2 right-0";
          else if (isEnd && checkIn && !isStart) bar = "left-0 right-1/2";

          return (
            <div
              key={i}
              className="relative flex h-11 items-center justify-center"
              onMouseEnter={() => onHover(s)}
            >
              {bar && <span className={`absolute inset-y-1 ${bar} bg-brand-100`} />}
              <button
                type="button"
                disabled={past}
                onClick={() => onPick(s)}
                className={`relative z-10 grid h-10 w-10 place-items-center rounded-full text-sm transition ${
                  endpoint
                    ? "bg-brand-600 font-semibold text-white"
                    : inRange
                      ? "text-brand-700"
                      : past
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-800 hover:ring-1 hover:ring-slate-900"
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
