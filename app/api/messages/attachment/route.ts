import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    // Path format is: conversationId/filename
    const parts = path.split("/");
    const conversationId = parts[0];

    if (!conversationId) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    // Check if the user has access to the conversation
    const { data: hasAccess, error } = await supabase
      .rpc("can_access_conversation", { p_conversation_id: conversationId });

    if (error || !hasAccess) {
      console.warn(`[attachment-auth] Blocked access to ${path} for user ${user.id}:`, error);
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Create a signed URL (short TTL, e.g. 60 seconds)
    const { data, error: signError } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(path, 60);

    if (signError || !data?.signedUrl) {
      console.error("[attachment-auth] Failed to create signed URL:", signError);
      return new NextResponse("Failed to generate access URL", { status: 500 });
    }

    // Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch (err) {
    console.error("[attachment-auth] Server error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
