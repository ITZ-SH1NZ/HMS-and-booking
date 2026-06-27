import { SkeletonHeader, SkeletonCardGrid } from "@/components/Skeleton";

// Shows inside the manager shell while a page segment loads.
export default function ManagerLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SkeletonHeader />
      <div className="mt-6">
        <SkeletonCardGrid count={6} />
      </div>
    </div>
  );
}
