import { SkeletonHeader, SkeletonList } from "@/components/Skeleton";

export default function BookingsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <SkeletonHeader />
      <div className="mt-6">
        <SkeletonList count={4} />
      </div>
    </div>
  );
}
