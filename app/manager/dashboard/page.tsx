import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPinIcon } from "@/components/icons";
import type { Hotel } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-rose-50 text-rose-700",
};

export default async function ManagerDashboardPage() {
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manager dashboard</h1>
          <p className="text-sm text-slate-500">
            Manage your hotels and reservations.
          </p>
        </div>
        <Link
          href="/manager/create-hotel"
          className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
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
            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{hotel.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPinIcon className="h-4 w-4 text-rose-500" /> {hotel.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      statusStyles[hotel.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {hotel.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
