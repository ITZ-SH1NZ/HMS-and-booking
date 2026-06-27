import { SkeletonCardGrid } from "@/components/Skeleton";

export default function HotelsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="skeleton mb-6 h-10 w-full max-w-xl rounded-full" />
      <SkeletonCardGrid count={9} />
    </div>
  );
}
