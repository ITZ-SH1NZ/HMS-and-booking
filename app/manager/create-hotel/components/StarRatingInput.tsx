"use client";

import { useState } from "react";
import { StarIcon } from "@/components/icons";

interface StarRatingInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  required?: boolean;
}

export default function StarRatingInput({
  value,
  onChange,
  label,
  required,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex flex-col">
      {label && (
        <span className="mb-1 text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(null)}
              onClick={() => onChange(star)}
              className="text-amber-400 p-0.5 hover:scale-110 transition focus:outline-none"
            >
              <StarIcon
                className="h-6 w-6"
                filled={star <= displayValue}
              />
            </button>
          ))}
        </div>

        {value > 0 && (
          <span className="text-sm font-semibold text-slate-700">
            {value} Star
          </span>
        )}
      </div>
    </div>
  );
}
