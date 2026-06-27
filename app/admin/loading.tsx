import { SkeletonHeader, SkeletonStats, SkeletonTable } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SkeletonHeader />
      <div className="mt-6 space-y-6">
        <SkeletonStats count={4} />
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
