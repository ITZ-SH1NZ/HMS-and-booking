"use client";

import useSWR from "swr";
import { StaffClient } from "./StaffClient";
import { SkeletonHeader, SkeletonList } from "@/components/Skeleton";
import type { StaffData } from "./types";

export default function StaffPage() {
  const { data, isLoading } = useSWR<StaffData>("/api/manager/staff");

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <SkeletonHeader />
        <div className="mt-8">
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  return <StaffClient hotels={data?.hotels ?? []} staff={data?.staff ?? []} invites={data?.invites ?? []} />;
}
