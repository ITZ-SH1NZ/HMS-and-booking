"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  helperText?: string;
}

export default function Toggle({
  checked,
  onChange,
  label,
  helperText,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      {label && (
        <div className="flex flex-col pr-4">
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          {helperText && (
            <span className="text-xs text-slate-500 mt-0.5">{helperText}</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-brand-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
