import Link from "next/link";

// Consistent empty state for lists/grids. Pass an icon, a message, and an
// optional call-to-action.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={`grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center ${className}`}
    >
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">{icon}</div>}
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
