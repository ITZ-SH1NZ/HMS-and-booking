import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function BookingReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/bookings/${id}/review`);
  }

  // 2. Fetch booking details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      hotels (
        id,
        name,
        location,
        image_url
      ),
      rooms (
        id,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  // 3. Authorize: Only the booking's guest can review
  if (booking.guest_id !== user.id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 text-center">
        <div className="rounded-3xl border border-red-100 bg-red-50/20 p-8 shadow-md backdrop-blur-md">
          <h1 className="text-xl font-black text-slate-950 font-serif">Access Denied</h1>
          <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
            Only the guest who made this booking can submit a review and complete checkout.
          </p>
        </div>
      </div>
    );
  }

  return <ReviewClient booking={booking as any} />;
}
