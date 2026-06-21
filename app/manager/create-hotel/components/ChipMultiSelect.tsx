"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";

interface ChipMultiSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  label?: string;
}

export default function ChipMultiSelect({
  selected,
  onChange,
  options,
  placeholder = "Add option...",
  allowCustom = true,
  label,
}: ChipMultiSelectProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleSelect = (item: string) => {
    if (!selected.includes(item)) {
      onChange([...selected, item]);
    }
    setDropdownOpen(false);
  };

  const handleRemove = (item: string) => {
    onChange(selected.filter((x) => x !== item));
  };



  const availableOptions = options.filter((o) => !selected.includes(o));

  return (
    <div className="flex flex-col relative w-full">
      {label && (
        <span className="mb-1 text-sm font-medium text-slate-700">
          {label}
        </span>
      )}

      {/* Chip Box Container */}
      <div className="flex flex-wrap gap-2 items-center min-h-[42px] p-1.5 border border-slate-300 rounded-lg bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
        {selected.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-800 rounded-full px-3 py-1 text-sm font-medium"
          >
            {item}
            <button
              type="button"
              onClick={() => handleRemove(item)}
              className="text-brand-600 hover:text-brand-800 text-xs font-bold leading-none w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-100 transition"
            >
              ×
            </button>
          </span>
        ))}

        {/* Dropdown Toggle Input */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="text-slate-500 hover:text-slate-700 font-semibold px-2 py-1 text-sm rounded hover:bg-slate-50 transition"
        >
          {selected.length === 0 ? "Select options..." : "+ Add more"}
        </button>
      </div>

      {/* Dropdown Options Drawer */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute top-[100%] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto p-2">
            {availableOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                {opt}
              </button>
            ))}

            {allowCustom && (
              <div
                className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-2"
              >
                <input
                  type="text"
                  placeholder={placeholder}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-600"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = customValue.trim();
                      if (val && !selected.includes(val)) {
                        onChange([...selected, val]);
                        setCustomValue("");
                      }
                      setDropdownOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const val = customValue.trim();
                    if (val && !selected.includes(val)) {
                      onChange([...selected, val]);
                      setCustomValue("");
                    }
                    setDropdownOpen(false);
                  }}
                  className="flex items-center justify-center p-1.5 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {availableOptions.length === 0 && !allowCustom && (
              <p className="text-center text-xs text-slate-400 py-2">
                No more options available
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
