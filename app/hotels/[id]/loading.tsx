import { Skeleton } from "@/components/Skeleton";

export default function HotelDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 lg:pb-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* breadcrumb */}
        <Skeleton className="h-4 w-72" />

        {/* title row */}
        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* hero collage */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <Skeleton className="aspect-[16/10] w-full sm:col-span-2 sm:row-span-2 sm:aspect-auto" />
          <Skeleton className="hidden aspect-[4/3] w-full sm:block" />
          <Skeleton className="hidden aspect-[4/3] w-full sm:block" />
          <Skeleton className="hidden aspect-[4/3] w-full sm:block" />
          <Skeleton className="hidden aspect-[4/3] w-full sm:block" />
        </div>

        {/* content + booking widget */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <Skeleton className="hidden h-80 w-full rounded-2xl lg:block" />
        </div>
      </div>
    </div>
  );
}
