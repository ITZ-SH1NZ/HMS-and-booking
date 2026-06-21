"use client";

import { useState, useCallback, useRef } from "react";
import Toggle from "../components/Toggle";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, BanIcon } from "@/components/icons";
import { ymd } from "@/lib/booking";
import { UseHotelDraftReturn } from "../useHotelDraft";
import type { BlockedDate, PricingSeason } from "@/lib/types";

interface Step8AvailabilityProps {
  draftContext: UseHotelDraftReturn;
}

export default function Step8Availability({ draftContext }: Step8AvailabilityProps) {
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeReason, setRangeReason] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState("");
  const [miniCalOpen, setMiniCalOpen] = useState<"start" | "end" | null>(null);
  const [miniCalMonth, setMiniCalMonth] = useState(0);
  const lastClickRef = useRef<{ date: string; time: number }>({ date: "", time: 0 });

  const {
    draft,
    rule,
    blockedDates,
    seasons,
    saving,
    saveAvailabilityRule,
    toggleBlocked,
    blockRange,
    unblockRange,
  } = draftContext;

  const handleCalendarDateClick = useCallback(
    async (dateStr: string) => {
      const now = Date.now();
      const last = lastClickRef.current;

      // Double-click detection (< 400ms on same date) → toggle individual block
      if (last.date === dateStr && now - last.time < 400) {
        lastClickRef.current = { date: "", time: 0 };
        await toggleBlocked(dateStr);
        return;
      }
      lastClickRef.current = { date: dateStr, time: now };

      // Range selection
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start fresh selection
        setRangeStart(dateStr);
        setRangeEnd("");
        setBulkError(null);
        setBulkSuccess(null);
      } else {
        // Second click sets end
        if (dateStr < rangeStart) {
          setRangeStart(dateStr);
        } else {
          setRangeEnd(dateStr);
        }
        setBulkError(null);
        setBulkSuccess(null);
      }
    },
    [rangeStart, rangeEnd, toggleBlocked],
  );

  if (!draft) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);

  // ── Helpers ──
  const isDateBlocked = (dateStr: string) =>
    blockedDates.some((b: BlockedDate) => b.date === dateStr);

  const isDateSeasonal = (dateStr: string) => {
    const d = new Date(dateStr);
    return seasons.some((s: PricingSeason) => {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      return d >= start && d <= end;
    });
  };

  // ── Range selection logic ──
  const previewEnd = rangeStart && !rangeEnd && hoverDate > rangeStart ? hoverDate : "";
  const effEnd = rangeEnd || previewEnd;

  const clearSelection = () => {
    setRangeStart("");
    setRangeEnd("");
    setHoverDate("");
    setBulkError(null);
    setBulkSuccess(null);
  };

  // ── Bulk actions ──
  const handleBulkBlock = async () => {
    if (!rangeStart || !rangeEnd) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      await blockRange(rangeStart, rangeEnd, rangeReason || undefined);
      const s = new Date(`${rangeStart}T00:00:00`);
      const e = new Date(`${rangeEnd}T00:00:00`);
      const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
      setBulkSuccess(`${days} date${days > 1 ? "s" : ""} blocked successfully!`);
      setRangeReason("");
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Failed to block dates.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (!rangeStart || !rangeEnd) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      await unblockRange(rangeStart, rangeEnd);
      const s = new Date(`${rangeStart}T00:00:00`);
      const e = new Date(`${rangeEnd}T00:00:00`);
      const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
      setBulkSuccess(`${days} date${days > 1 ? "s" : ""} unblocked successfully!`);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Failed to unblock dates.");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Availability rules ──
  const openForBooking = rule?.open_for_booking ?? true;
  const advanceDays = rule?.advance_days;
  const isUnlimitedAdvance = rule !== null && rule !== undefined && rule.advance_days === null;
  const minStayWeekday = rule?.min_stay_weekday ?? 1;
  const minStayWeekend = rule?.min_stay_weekend ?? 1;
  const maxStay = rule?.max_stay ?? "";

  const handleToggleBookingOpen = (checked: boolean) => {
    saveAvailabilityRule({ open_for_booking: checked });
  };

  const handleRuleChange = (field: string, val: boolean | number | null) => {
    saveAvailabilityRule({ [field]: val });
  };

  // ── Month data ──
  const month1 = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
  const month2 = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset + 1, 1);

  const fmtRange = (d: string) =>
    d
      ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left column: Settings */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Availability settings
          </h3>

          <div className="space-y-4">
            <Toggle
              label="Open for booking"
              helperText="Guests can search and book this property"
              checked={openForBooking}
              onChange={handleToggleBookingOpen}
            />

            <div className="flex flex-col border-t border-slate-100 pt-4 gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Advance booking window
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRuleChange("advance_days", isUnlimitedAdvance ? 365 : null)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                    isUnlimitedAdvance ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                      isUnlimitedAdvance ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  Unlimited
                </span>
                <span className="text-[10px] text-slate-400">
                  {isUnlimitedAdvance ? "No booking window limit" : ""}
                </span>
              </div>
              {!isUnlimitedAdvance && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Guests can book up to</span>
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-600"
                    value={advanceDays ?? 365}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleRuleChange("advance_days", isNaN(val) ? 1 : val);
                    }}
                    placeholder="365"
                  />
                  <span className="text-xs text-slate-500">days in advance</span>
                </div>
              )}
            </div>

            <div className="flex flex-col border-t border-slate-100 pt-4 gap-3">
              <span className="text-sm font-semibold text-slate-700">Minimum stay requirements</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Weekdays (Nights)</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-600"
                    value={minStayWeekday}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleRuleChange("min_stay_weekday", isNaN(val) ? 1 : val);
                    }}
                    placeholder="1"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Weekends (Nights)</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-600"
                    value={minStayWeekend}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleRuleChange("min_stay_weekend", isNaN(val) ? 1 : val);
                    }}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col border-t border-slate-100 pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-1">
                Maximum stay limit
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Guests can stay a maximum of</span>
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-600"
                  value={maxStay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleRuleChange("max_stay", isNaN(val) ? null : val);
                  }}
                  placeholder="Unlimited"
                />
                <span className="text-xs text-slate-500">nights</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: Calendar + Bulk Manager */}
      <div className="lg:col-span-7 space-y-6">
        {/* Premium Calendar Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarIcon className="h-5 w-5 text-brand-700" />
              Calendar blocking
            </h3>
            {(rangeStart || rangeEnd) && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 transition px-2 py-1 rounded-lg hover:bg-brand-50"
              >
                Clear selection
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 mb-1">
            Click to select a date range, or <strong className="text-slate-700">double-click</strong> any date to toggle it individually.
          </p>

          {/* Selection indicator */}
          {(rangeStart || rangeEnd) && (
            <div className="flex items-center gap-2 mt-2 mb-4">
              <div className="flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1">
                <span className="text-[10px] font-bold text-brand-800">
                  {rangeStart ? fmtRange(rangeStart) : "—"}
                </span>
                <span className="text-brand-400">→</span>
                <span className="text-[10px] font-bold text-brand-800">
                  {rangeEnd ? fmtRange(rangeEnd) : effEnd ? fmtRange(effEnd) : "Select end"}
                </span>
              </div>
              {saving && (
                <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
              )}
            </div>
          )}

          {/* Dual-month calendar */}
          <div className="relative" onMouseLeave={() => setHoverDate("")}>
            {/* Outer navigation */}
            <button
              type="button"
              onClick={() => setCurrentMonthOffset((o) => Math.max(0, o - 1))}
              disabled={currentMonthOffset === 0}
              className="absolute left-0 top-0 z-10 grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonthOffset((o) => o + 1)}
              className="absolute right-0 top-0 z-10 grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4 text-slate-600" />
            </button>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <CalMonth
                date={month1}
                today={today}
                todayStr={todayStr}
                rangeStart={rangeStart}
                effEnd={effEnd}
                isDateBlocked={isDateBlocked}
                isDateSeasonal={isDateSeasonal}
                onPick={handleCalendarDateClick}
                onHover={setHoverDate}
              />
              <div className="hidden xl:block">
                <CalMonth
                  date={month2}
                  today={today}
                  todayStr={todayStr}
                  rangeStart={rangeStart}
                  effEnd={effEnd}
                  isDateBlocked={isDateBlocked}
                  isDateSeasonal={isDateSeasonal}
                  onPick={handleCalendarDateClick}
                  onHover={setHoverDate}
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 mt-5 text-[10px] font-bold text-slate-500 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-brand-50 border border-brand-200 block" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-200 border border-slate-400 block relative">
                <span className="absolute inset-0 flex items-center justify-center text-[6px] text-slate-500">✕</span>
              </span>
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-amber-400 bg-amber-50 block" />
              <span>Seasonal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-brand-600 block" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-6 rounded bg-brand-100 block" />
              <span>Range</span>
            </div>
          </div>
        </div>

        {/* Bulk Availability Manager */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
            <BanIcon className="h-5 w-5 text-brand-700" />
            Bulk Availability Manager
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Select dates on the calendar above or pick them below, then block or unblock the entire range.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date Picker */}
              <div className="relative flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <button
                  type="button"
                  onClick={() => {
                    setMiniCalOpen(miniCalOpen === "start" ? null : "start");
                    setMiniCalMonth(0);
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition ${
                    miniCalOpen === "start"
                      ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50/50"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className={rangeStart ? "text-slate-800 font-semibold" : "text-slate-400"}>
                    {rangeStart ? fmtRange(rangeStart) : "Pick start date"}
                  </span>
                </button>
                {miniCalOpen === "start" && (
                  <div className="absolute top-full left-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-1">
                      <button type="button" onClick={() => setMiniCalMonth((m) => m - 1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronLeftIcon className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                      <button type="button" onClick={() => setMiniCalMonth((m) => m + 1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                    </div>
                    <MiniCalMonth
                      date={new Date(today.getFullYear(), today.getMonth() + miniCalMonth, 1)}
                      today={today}
                      todayStr={todayStr}
                      selected={rangeStart}
                      onPick={(d) => {
                        setRangeStart(d);
                        if (rangeEnd && d > rangeEnd) setRangeEnd("");
                        setMiniCalOpen(null);
                        setBulkError(null);
                        setBulkSuccess(null);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* End Date Picker */}
              <div className="relative flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1">End Date</label>
                <button
                  type="button"
                  onClick={() => {
                    setMiniCalOpen(miniCalOpen === "end" ? null : "end");
                    setMiniCalMonth(0);
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition ${
                    miniCalOpen === "end"
                      ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50/50"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className={rangeEnd ? "text-slate-800 font-semibold" : "text-slate-400"}>
                    {rangeEnd ? fmtRange(rangeEnd) : "Pick end date"}
                  </span>
                </button>
                {miniCalOpen === "end" && (
                  <div className="absolute top-full right-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-1">
                      <button type="button" onClick={() => setMiniCalMonth((m) => m - 1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronLeftIcon className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                      <button type="button" onClick={() => setMiniCalMonth((m) => m + 1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                    </div>
                    <MiniCalMonth
                      date={new Date(today.getFullYear(), today.getMonth() + miniCalMonth, 1)}
                      today={today}
                      todayStr={todayStr}
                      selected={rangeEnd}
                      minDate={rangeStart}
                      onPick={(d) => {
                        setRangeEnd(d);
                        setMiniCalOpen(null);
                        setBulkError(null);
                        setBulkSuccess(null);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Reason (for blocking)</label>
              <input
                type="text"
                placeholder="e.g. Renovation, Seasonal closure"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition"
                value={rangeReason}
                onChange={(e) => {
                  setRangeReason(e.target.value);
                  setBulkError(null);
                  setBulkSuccess(null);
                }}
              />
            </div>

            {bulkError && (
              <p className="text-xs text-brand-600 font-semibold">{bulkError}</p>
            )}
            {bulkSuccess && (
              <p className="text-xs text-brand-700 font-semibold">{bulkSuccess}</p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={handleBulkUnblock}
                disabled={bulkLoading || !rangeStart || !rangeEnd}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkLoading ? "Updating..." : "Unblock Range"}
              </button>
              <button
                type="button"
                onClick={handleBulkBlock}
                disabled={bulkLoading || !rangeStart || !rangeEnd}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkLoading ? "Updating..." : "Block Range"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   CalMonth — a single month grid with Airbnb-style range highlight bars.
   ────────────────────────────────────────────────────────────────────────── */
function CalMonth({
  date,
  today,
  todayStr,
  rangeStart,
  effEnd,
  isDateBlocked,
  isDateSeasonal,
  onPick,
  onHover,
}: {
  date: Date;
  today: Date;
  todayStr: string;
  rangeStart: string;
  effEnd: string;
  isDateBlocked: (d: string) => boolean;
  isDateSeasonal: (d: string) => boolean;
  onPick: (d: string) => void;
  onHover: (d: string) => void;
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
      <p className="mb-4 text-center text-sm font-semibold text-slate-800">
        {date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </p>
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) return <span key={i} />;

          const s = ymd(cell);
          const isPast = cell < today;
          const blocked = isDateBlocked(s);
          const seasonal = isDateSeasonal(s);
          const isToday = s === todayStr;

          // Range state
          const isStart = s === rangeStart;
          const isEnd = s === effEnd;
          const inRange = rangeStart && effEnd && s > rangeStart && s < effEnd;
          const endpoint = isStart || isEnd;

          // Connected highlight bar calculation
          let bar = "";
          if (inRange) bar = "left-0 right-0";
          else if (isStart && effEnd && !isEnd) bar = "left-1/2 right-0";
          else if (isEnd && rangeStart && !isStart) bar = "left-0 right-1/2";

          // Date cell styling
          let cellClass = "";
          if (isPast) {
            cellClass = "cursor-not-allowed text-slate-300";
          } else if (endpoint) {
            cellClass = "bg-brand-600 text-white font-bold shadow-sm";
          } else if (blocked) {
            cellClass = "bg-slate-200 text-slate-400 line-through";
          } else if (inRange) {
            cellClass = "text-brand-800 font-semibold";
          } else if (seasonal) {
            cellClass = "bg-amber-50 border border-amber-300 text-amber-800";
          } else {
            cellClass =
              "text-slate-800 hover:ring-2 hover:ring-brand-400 hover:bg-brand-50";
          }

          return (
            <div
              key={i}
              className="relative flex h-11 items-center justify-center"
              onMouseEnter={() => onHover(s)}
            >
              {/* Connecting range bar */}
              {bar && (
                <span className={`absolute inset-y-1 ${bar} bg-brand-100 rounded-sm`} />
              )}
              <button
                type="button"
                disabled={isPast}
                onClick={() => onPick(s)}
                className={`relative z-10 grid h-10 w-10 place-items-center rounded-full text-sm transition-all duration-150 ${cellClass}`}
              >
                {cell.getDate()}
              </button>
              {/* Today dot indicator */}
              {isToday && !endpoint && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 h-1 w-1 rounded-full bg-brand-600" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   MiniCalMonth — compact single-month popover calendar for the Bulk Manager.
   ────────────────────────────────────────────────────────────────────────── */
function MiniCalMonth({
  date,
  today,
  todayStr,
  selected,
  minDate,
  onPick,
}: {
  date: Date;
  today: Date;
  todayStr: string;
  selected: string;
  minDate?: string;
  onPick: (d: string) => void;
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
      <p className="mb-3 text-center text-xs font-bold text-slate-700">
        {date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </p>
      <div className="mb-1 grid grid-cols-7 text-center text-[9px] font-bold text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <span key={i} />;

          const s = ymd(cell);
          const isPast = cell < today;
          const isBefore = minDate ? s < minDate : false;
          const disabled = isPast || isBefore;
          const isSel = s === selected;
          const isToday = s === todayStr;

          return (
            <div key={i} className="relative flex h-8 items-center justify-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(s)}
                className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-xs transition-all duration-150 ${
                  disabled
                    ? "cursor-not-allowed text-slate-300"
                    : isSel
                      ? "bg-brand-600 text-white font-bold shadow-sm"
                      : "text-slate-700 hover:bg-brand-50 hover:ring-2 hover:ring-brand-400"
                }`}
              >
                {cell.getDate()}
              </button>
              {isToday && !isSel && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 h-0.5 w-0.5 rounded-full bg-brand-600" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
