"use client";

import Link from "next/link";
import useSWR from "swr";
import { PlusIcon } from "@/components/icons";
import { HotelsGrid } from "./HotelsGrid";
import { SkeletonCardGrid } from "@/components/Skeleton";
import type { ManagerHotelCard } from "./types";

export default function ManagerHotelsPage() {
  const { data, isLoading } = useSWR<ManagerHotelCard[]>("/api/manager/hotels");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotels</h1>
          <p className="text-sm text-slate-500">Add, edit and manage your properties.</p>
        </div>
        <Link
          href="/manager/create-hotel"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" /> Add hotel
        </Link>
      </div>

      <div className="mt-6">
        {isLoading && !data ? <SkeletonCardGrid count={6} /> : <HotelsGrid hotels={data ?? []} />}
      </div>
    </div>
  );
}
