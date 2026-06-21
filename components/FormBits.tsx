import { labelClass } from "@/components/AuthCard";

export function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6 flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i < step ? "bg-brand-600" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}
