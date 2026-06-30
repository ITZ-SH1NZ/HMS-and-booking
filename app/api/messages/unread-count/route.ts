import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const { data: convs, error } = await supabase
      .from("conversations")
      .select("guest_unread")
      .eq("guest_id", user.id);

    if (error) {
      console.error("[unread-count] error querying conversations:", error);
      return NextResponse.json({ count: 0 });
    }

    const totalUnread = (convs ?? []).reduce(
      (sum, c) => sum + (c.guest_unread || 0),
      0
    );

    return NextResponse.json({ count: totalUnread });
  } catch (err) {
    console.error("[unread-count] error:", err);
    return NextResponse.json({ count: 0 });
  }
}
