import { Skeleton, SkeletonHeader } from "@/components/Skeleton";

export default function GuestDashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-in">
      <SkeletonHeader />
      
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Bookings Skeleton */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </section>

        {/* Profile Skeleton */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-20 mb-4" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between border-b border-slate-100 py-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
