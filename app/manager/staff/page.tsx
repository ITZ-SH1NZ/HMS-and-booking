"use client";

import useSWR from "swr";
import { StaffClient } from "./StaffClient";
import type { StaffData } from "./types";

export default function StaffPage() {
  const { data, isLoading } = useSWR<StaffData>("/api/manager/staff");

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-7 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return <StaffClient hotels={data?.hotels ?? []} staff={data?.staff ?? []} invites={data?.invites ?? []} />;
}
