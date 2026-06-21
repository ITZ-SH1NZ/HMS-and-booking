import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GuestDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single();
  const profile = data as Profile | null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">My account</h1>
      <p className="text-sm text-slate-500">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Bookings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">My bookings</h2>
          <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            <p>You have no bookings yet.</p>
            <Link href="/" className="mt-2 font-semibold text-brand-600">
              Browse hotels
            </Link>
          </div>
        </section>

        {/* Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="Full name" value={profile?.full_name ?? "—"} />
            <Row label="Phone" value={profile?.phone ?? "—"} />
            <Row label="Date of birth" value={profile?.dob ?? "—"} />
            <Row label="Location" value={profile?.location ?? "—"} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
