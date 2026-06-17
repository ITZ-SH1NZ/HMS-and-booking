import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole, VerificationStatus } from "@/lib/types";

// Refreshes the Supabase session cookie on every request and enforces
// role-based access to protected route groups.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isGuestArea = path.startsWith("/dashboard");
  const isManagerArea = path.startsWith("/manager");
  const isAdminArea = path.startsWith("/admin");

  // Not logged in and trying to reach a protected area → send to login.
  if (!user && (isGuestArea || isManagerArea || isAdminArea)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && (isGuestArea || isManagerArea || isAdminArea)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    const redirectTo = (pathname: string) => {
      const url = request.nextUrl.clone();
      url.pathname = pathname;
      url.search = "";
      return NextResponse.redirect(url);
    };

    if (isAdminArea && role !== "admin") return redirectTo("/");
    if (isGuestArea && role !== "guest") return redirectTo("/");

    if (isManagerArea && role !== "manager") return redirectTo("/");

    // Managers: gate the dashboard behind approval status.
    if (isManagerArea && role === "manager") {
      const { data: mv } = await supabase
        .from("manager_verifications")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = mv?.status as VerificationStatus | undefined;
      const onWaiting = path.startsWith("/manager/waiting");

      if (status !== "approved" && !onWaiting) {
        return redirectTo("/manager/waiting");
      }
      if (status === "approved" && onWaiting) {
        return redirectTo("/manager/dashboard");
      }
    }
  }

  return response;
}
