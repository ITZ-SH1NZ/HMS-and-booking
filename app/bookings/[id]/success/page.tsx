import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Price } from "@/components/Price";
import { CheckCircleIcon } from "@/components/icons";
import type { BookingDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/bookings/${id}`);

  const { data } = await supabase
    .from("bookings")
    .select("*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)")
    .eq("id", id)
    .maybeSingle();

  const booking = data as BookingDetail | null;
  if (!booking) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircleIcon className="h-9 w-9" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Booking confirmed!
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your stay at {booking.hotels?.name} is booked.
        </p>

        <div className="mt-6 space-y-1 rounded-xl bg-slate-50 p-4 text-left text-sm">
          <Row label="Booking ID" value={booking.id.slice(0, 8).toUpperCase()} />
          <Row label="Room" value={`${booking.rooms?.name} × ${booking.num_rooms}`} />
          <Row label="Check in" value={fmt(booking.check_in)} />
          <Row label="Check out" value={fmt(booking.check_out)} />
          <div className="flex justify-between pt-1 font-semibold text-slate-900">
            <span>Total paid</span>
            <Price amount={booking.total_price} />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          A confirmation email will be sent once email delivery is configured.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/bookings/${booking.id}`}
            className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            View booking
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
