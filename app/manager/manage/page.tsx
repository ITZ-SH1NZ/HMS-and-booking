"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { preload } from "swr";
import { BuildingIcon, ArrowRightIcon } from "@/components/icons";
import { fetcher } from "@/lib/swr";
import { SkeletonHeader, SkeletonList } from "@/components/Skeleton";
import type { ManagePickerData } from "./types";

export default function ManagePickerPage() {
  const router = useRouter();
  const { data, isLoading } = useSWR<ManagePickerData>("/api/manager/manage");

  const hotels = data?.hotels ?? [];
  const role = data?.role;

  // One hotel → skip the picker entirely.
  useEffect(() => {
    if (data && hotels.length === 1) router.replace(`/manager/manage/${hotels[0].id}`);
  }, [data, hotels, router]);

  if ((isLoading && !data) || (data && hotels.length === 1)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <SkeletonHeader />
        <div className="mt-6">
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Manage</h1>
      <p className="text-sm text-slate-500">Choose a hotel to open its front desk.</p>

      {hotels.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <BuildingIcon className="h-8 w-8 text-slate-300" />
          <p className="mt-2 font-medium text-slate-700">No hotels to manage yet</p>
          {role !== "staff" && (
            <Link href="/manager/create-hotel" className="mt-3 text-sm font-semibold text-brand-700">
              Create a hotel
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {hotels.map((h) => (
            <Link
              key={h.id}
              href={`/manager/manage/${h.id}`}
              onMouseEnter={() => preload(`/api/manager/manage/${h.id}`, fetcher)}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900">{h.name}</h3>
                <p className="truncate text-sm text-slate-500">{h.location}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span><b className="text-slate-700">{h.inHouse}</b> in-house</span>
                  <span><b className="text-green-700">{h.arrivals}</b> arrivals</span>
                  <span><b className="text-amber-700">{h.departures}</b> departures</span>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
