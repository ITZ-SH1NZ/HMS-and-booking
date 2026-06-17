import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, VerificationStatus } from "@/lib/types";

// Handles the redirect from email-verification links and Google OAuth.
// Exchanges the `code` for a session, then routes the user by role.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitRedirect = searchParams.get("redirect");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  if (explicitRedirect) {
    return NextResponse.redirect(`${origin}${explicitRedirect}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "guest";

  if (role === "admin") {
    return NextResponse.redirect(`${origin}/admin/dashboard`);
  }

  if (role === "manager") {
    const { data: mv } = await supabase
      .from("manager_verifications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const status = mv?.status as VerificationStatus | undefined;
    return NextResponse.redirect(
      `${origin}${status === "approved" ? "/manager/dashboard" : "/manager/waiting"}`,
    );
  }

  return NextResponse.redirect(`${origin}/`);
}
