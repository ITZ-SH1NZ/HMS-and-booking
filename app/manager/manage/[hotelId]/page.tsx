"use client";

import { use } from "react";
import useSWR from "swr";
import { FrontDesk } from "./FrontDesk";
import type { FrontDeskData } from "./types";

export default function FrontDeskPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, isLoading, error } = useSWR<FrontDeskData>(`/api/manager/manage/${hotelId}`);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:px-6">
        <p className="font-semibold text-slate-700">Hotel not found</p>
        <p className="mt-1 text-sm text-slate-500">You may not have access to this hotel.</p>
      </div>
    );
  }

  if ((isLoading && !data) || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <FrontDesk
      hotel={data.hotel}
      rooms={data.rooms}
      bookings={data.bookings}
      permissions={data.permissions}
      isManager={data.isManager}
    />
  );
}
