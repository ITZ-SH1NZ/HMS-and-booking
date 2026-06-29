import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/bookings/[id]/status — update booking status (check-in/check-out)
// Restrained to the hotel's manager or staff.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { status: "checked_in" | "completed" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status } = body;
  if (status !== "checked_in" && status !== "completed") {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  }

  // 2. Fetch the booking and its hotel details using the admin client
  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, hotel_id, status, total_price, check_in, hotels(manager_id)")
    .eq("id", id)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const hotelId = booking.hotel_id;
  const managerId = (booking.hotels as any)?.manager_id;

  // 3. Authorize: User must be either the manager or a staff member
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
    return NextResponse.json(
      { error: "Unauthorized. Only hotel managers or staff can check guests in/out." },
      { status: 403 }
    );
  }

  // 4. Date validation: Cannot check-in before the scheduled check-in date
  if (status === "checked_in") {
    const today = new Date();
    // Format today as YYYY-MM-DD in local time to match booking date formats
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localToday = new Date(today.getTime() - tzOffset);
    const todayStr = localToday.toISOString().split("T")[0];

    if (todayStr < booking.check_in) {
      return NextResponse.json(
        { error: `Early Check-In Blocked: Guest's reservation starts on ${booking.check_in}. Today is ${todayStr}.` },
        { status: 400 }
      );
    }
  }

  // 5. Perform the update using the admin client (bypasses RLS and table privileges)
  const { error: updateError } = await admin
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 6. On checkout (status === 'completed'), also mark payments as completed
  if (status === "completed") {
    await admin
      .from("payments")
      .update({ status: "completed", paid_at: new Date().toISOString() })
      .eq("booking_id", id);
  }

  return NextResponse.json({ success: true, newStatus: status });
}
