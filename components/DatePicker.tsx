"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date of birth",
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to 25 years ago
  const getInitialDate = () => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? getInitialDate() : null);
  const [viewDate, setViewDate] = useState<Date>(getInitialDate());
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const [yearStart, setYearStart] = useState<number>(viewDate.getFullYear() - 7);

  // Sync state if value changes from outside
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        setSelectedDate(d);
        setViewDate(d);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    
    // Format as YYYY-MM-DD using local time
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, "0");
    const dd = String(newDate.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleMonthSelect = (mIndex: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(mIndex);
    setViewDate(newDate);
    setViewMode("days");
  };

  const handleYearSelect = (selectedYear: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(selectedYear);
    setViewDate(newDate);
    setViewMode("days");
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(viewDate);
    if (direction === "prev") {
      newDate.setMonth(month - 1);
    } else {
      newDate.setMonth(month + 1);
    }
    setViewDate(newDate);
  };

  const navigateYears = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setYearStart(prev => prev - 16);
    } else {
      setYearStart(prev => prev + 16);
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setViewMode("days");
    if (selectedDate) {
      setViewDate(selectedDate);
      setYearStart(selectedDate.getFullYear() - 7);
    } else {
      const d = getInitialDate();
      setViewDate(d);
      setYearStart(d.getFullYear() - 7);
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* Trigger Button / Input */}
      <div className="relative">
        <CalendarIcon className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          readOnly
          required={required}
          value={formatDisplayDate(selectedDate)}
          onClick={handleInputClick}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 cursor-pointer text-slate-800 font-medium"
        />
      </div>

      {/* Popover / Modal */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="fixed md:absolute left-1/2 md:left-0 bottom-0 md:bottom-auto md:top-full translate-x-[-50%] md:translate-x-0 z-50 mt-1 w-full max-w-[320px] bg-white rounded-3xl md:rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-4 flex flex-col gap-3 animate-scale-in">
            
            {/* Header: Month/Year navigation */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              {viewMode === "days" && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateMonth("prev")}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("months");
                      }}
                      className="text-xs font-bold text-slate-800 hover:bg-slate-50 px-2 py-1 rounded-lg"
                    >
                      {MONTHS[month]}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("years");
                        setYearStart(year - 7);
                      }}
                      className="text-xs font-bold text-slate-800 hover:bg-slate-50 px-2 py-1 rounded-lg"
                    >
                      {year}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateMonth("next")}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {viewMode === "months" && (
                <>
                  <span className="text-xs font-bold text-slate-800 px-2 py-1">Select Month</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("days")}
                    className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg"
                  >
                    Back
                  </button>
                </>
              )}

              {viewMode === "years" && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateYears("prev")}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800">
                    {yearStart} - {yearStart + 15}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateYears("next")}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Content Body */}
            <div className="min-h-[190px] flex items-center justify-center">
              
              {/* DAYS VIEW */}
              {viewMode === "days" && (
                <div className="w-full grid grid-cols-7 gap-y-1 text-center">
                  {/* Weekday headers */}
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="text-[10px] font-bold text-slate-400 py-1">
                      {day}
                    </span>
                  ))}
                  
                  {/* Empty slots for offset */}
                  {Array.from({ length: firstDayIndex }).map((_, idx) => (
                    <span key={`empty-${idx}`} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isSelected = selectedDate && 
                      selectedDate.getDate() === dayNum && 
                      selectedDate.getMonth() === month && 
                      selectedDate.getFullYear() === year;
                    
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleDayClick(dayNum)}
                        className={`text-xs py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          isSelected
                            ? "bg-[#0A4335] text-white font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* MONTHS VIEW */}
              {viewMode === "months" && (
                <div className="w-full grid grid-cols-3 gap-2 py-1">
                  {MONTHS.map((m, idx) => {
                    const isSelected = month === idx;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMonthSelect(idx)}
                        className={`text-xs py-2 rounded-lg font-medium transition cursor-pointer ${
                          isSelected
                            ? "bg-[#0A4335] text-white font-bold"
                            : "text-slate-700 hover:bg-slate-50 border border-slate-100"
                        }`}
                      >
                        {m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* YEARS VIEW */}
              {viewMode === "years" && (
                <div className="w-full grid grid-cols-4 gap-1.5 py-1">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const currentYear = yearStart + idx;
                    const isSelected = year === currentYear;
                    return (
                      <button
                        key={currentYear}
                        type="button"
                        onClick={() => handleYearSelect(currentYear)}
                        className={`text-xs py-2.5 rounded-lg font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-[#0A4335] text-white font-bold"
                            : "text-slate-700 hover:bg-slate-50 border border-slate-100"
                        }`}
                      >
                        {currentYear}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        </>
      )}
    </div>
  );
}
