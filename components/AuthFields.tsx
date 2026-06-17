"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

const shell =
  "flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 transition focus-within:border-rose-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100";

const inputBase =
  "w-full bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

type IconFieldProps = {
  icon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

// Text/email/date input with an optional leading icon.
export function IconField({ icon, className, ...props }: IconFieldProps) {
  return (
    <div className={shell}>
      {icon && <span className="text-slate-400">{icon}</span>}
      <input {...props} className={`${inputBase} ${className ?? ""}`} />
    </div>
  );
}

type PasswordFieldProps = {
  icon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

// Password input with a leading icon and a show/hide toggle.
export function PasswordField({ icon, className, ...props }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className={shell}>
      {icon && <span className="text-slate-400">{icon}</span>}
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${inputBase} ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="text-slate-400 hover:text-slate-600"
      >
        {show ? (
          <EyeOffIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// Wraps a native <select> or date input in the same shell for consistency.
export function FieldShell({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={shell}>
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </div>
  );
}

export const bareInput = inputBase;
