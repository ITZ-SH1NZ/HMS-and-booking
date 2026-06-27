"use client";

import Link from "next/link";
import useSWR from "swr";
import { PlusIcon } from "@/components/icons";
import { HotelsGrid } from "./HotelsGrid";
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
        {isLoading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="aspect-[16/10] w-full animate-pulse bg-slate-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="mt-3 h-9 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HotelsGrid hotels={data ?? []} />
        )}
      </div>
    </div>
  );
}
