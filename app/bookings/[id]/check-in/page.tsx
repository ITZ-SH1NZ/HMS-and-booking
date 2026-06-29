import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckInPortalClient } from "./CheckInPortalClient";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Authenticate the staff member/manager
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/bookings/${id}/check-in`);

  // 2. Fetch booking details with hotel manager info using the admin client
  // (This avoids RLS issues for staff members and allows querying the booking)
  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select(`
      *,
      hotels (
        id,
        name,
        location,
        image_url,
        manager_id
      ),
      rooms (
        id,
        name,
        capacity
      ),
      profiles!bookings_guest_id_fkey (
        full_name,
        phone
      ),
      payments (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) notFound();

  const hotelId = booking.hotel_id;
  const managerId = (booking.hotels as any)?.manager_id;

  // 3. Authorize: User must be manager or staff
  const isManager = managerId === user.id;

  let isStaff = false;
  if (!isManager) {
    const { data: staffRow } = await supabase
      .from("hotel_staff")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("staff_id", user.id)
      .maybeSingle();
    if (staffRow) isStaff = true;
  }

  if (!isManager && !isStaff) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12 text-center">
        <div className="rounded-3xl border border-red-100 bg-red-50/20 p-8 shadow-md backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-slate-950 font-serif">Access Denied</h1>
          <p className="mt-2 text-xs text-slate-550 font-medium leading-relaxed">
            Only authorized managers or staff members of <strong>{booking.hotels?.name}</strong> can access this check-in portal.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Resolve the guest's email from the Auth system (since profiles has no email column)
  let guestEmail = booking.guest_email || "No email provided";
  if (!booking.guest_email && booking.guest_id) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(booking.guest_id);
      guestEmail = userData.user?.email || "No email provided";
    } catch (e) {
      console.error("Failed to fetch guest user email:", e);
    }
  }

  // Inject the email into the profiles object for the client component
  const bookingWithEmail = {
    ...booking,
    profiles: booking.profiles
      ? { ...booking.profiles, email: guestEmail }
      : { full_name: booking.guest_name || "Guest", email: guestEmail, phone: booking.guest_phone || "No phone provided" }
  };

  return <CheckInPortalClient booking={bookingWithEmail as any} />;
}
