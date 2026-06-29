import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPinIcon, CheckCircleIcon } from "@/components/icons";
import type { Hotel } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border border-green-300",
  pending: "bg-amber-50 text-amber-700 border border-amber-300",
  rejected: "bg-brand-50 text-brand-700 border border-brand-300",
  draft: "bg-slate-100 text-slate-700 border border-slate-300",
};

interface DashboardProps {
  searchParams: Promise<{ published?: string }>;
}

export default async function ManagerDashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const showToast = params.published === "success";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("hotels")
    .select("*")
    .eq("manager_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const hotels = (data as Hotel[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 relative">
      {/* Success Publish Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-brand-700 text-white shadow-xl border border-brand-800 p-4 flex items-center gap-3 animate-slideUp">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Successfully Published!</span>
            <span className="text-xs opacity-90">Your property listing has been sent for admin verification.</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manager dashboard</h1>
          <p className="text-sm text-slate-500">
            Manage your hotels and reservations.
          </p>
        </div>
        <Link
          href="/manager/create-hotel"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Create Hotel
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Your hotels</h2>
        {hotels.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="font-medium text-slate-700">No hotels yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first hotel — it&apos;ll appear publicly once an admin
              approves it.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {hotels.map((hotel) => {
              const isDraft = hotel.status === "draft";
              const stepUrl = `/manager/create-hotel?step=${hotel.wizard_step || 1}`;

              return (
                <div
                  key={hotel.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{hotel.name}</h3>
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <MapPinIcon className="h-4 w-4 text-brand-500" /> {hotel.location}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          statusStyles[hotel.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {hotel.status}
                      </span>
                    </div>
                  </div>

                  {isDraft ? (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">
                        Completed step {hotel.wizard_step || 1} of 9
                      </span>
                      <Link
                        href={stepUrl}
                        className="text-green-700 font-bold hover:text-emerald-800"
                      >
                        Resume Draft &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end items-center gap-4 text-xs">
                      <Link
                        href={`/manager/hotel/${hotel.id}/edit`}
                        className="text-slate-500 font-semibold hover:text-brand-600"
                      >
                        Edit hotel &rarr;
                      </Link>
                      <Link
                        href="/manager/reservations"
                        className="text-slate-500 font-semibold hover:text-brand-600"
                      >
                        View reservations &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
