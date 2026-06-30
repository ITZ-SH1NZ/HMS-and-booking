import { NextResponse } from "next/server";
import { getManagerContext } from "@/lib/authServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase, userId } = await getManagerContext();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");

    if (!guestId) {
      return NextResponse.json({ error: "guestId is required" }, { status: 400 });
    }

    // Security Check: To prevent leaking emails, verify the manager/staff has at
    // least one conversation thread with this guest.
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("guest_id", guestId)
      .limit(1);

    if (convError || !convData || convData.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized access to guest profile" },
        { status: 403 }
      );
    }

    // Resolve email using admin service-role
    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(guestId);

    if (userError || !userData?.user) {
      console.error("[guest-email] auth fetch error:", userError);
      return NextResponse.json({ email: "No email provided" });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (err) {
    console.error("[guest-email] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
