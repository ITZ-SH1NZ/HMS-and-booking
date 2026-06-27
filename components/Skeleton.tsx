// Reusable loading wireframes. The `.skeleton` class (globals.css) adds a
// shimmer; compose these to mirror a page's real layout so navigation shows an
// instant placeholder instead of a blank wait.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

/** A hotel/property card placeholder. */
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-3 h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** A list of rows (bookings, staff, picker items). */
export function SkeletonList({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** A row of stat tiles. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A simple table placeholder. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page header placeholder (title + subtitle). */
export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
