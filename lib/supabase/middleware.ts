import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole, VerificationStatus } from "@/lib/types";

// Refreshes the Supabase session cookie and enforces role-based access to the
// protected route groups. Kept lean: public pages do zero DB work, the auth
// check uses getClaims() (local JWT verification when signing keys are on), and
// the two role/verification queries run in parallel. /api is excluded via the
// matcher in proxy.ts, so SWR data fetches don't pay this cost.
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const isGuestArea = path.startsWith("/dashboard");
  const isManagerArea = path.startsWith("/manager");
  const isAdminArea = path.startsWith("/admin");
  const isProtected = isGuestArea || isManagerArea || isAdminArea;

  // Resolve the user. getClaims verifies the JWT locally (no Auth-server round
  // trip when JWT signing keys are enabled) and still refreshes the cookie.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;

  // Not logged in: only redirect away from protected areas; leave public pages
  // untouched (and pay nothing extra).
  if (!userId) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Logged in but on a public page: nothing to gate.
  if (!isProtected) return response;

  // Fetch role + suspension (and, for the manager area, the latest
  // verification) in parallel.
  const [{ data: profile }, { data: mv }] = await Promise.all([
    supabase.from("profiles").select("role, suspended").eq("id", userId).single(),
    isManagerArea
      ? supabase
          .from("manager_verifications")
          .select("status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null }),
  ]);

  const role = profile?.role as UserRole | undefined;

  const redirectTo = (pathname: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  };

  // Suspended accounts lose access to all protected areas.
  if ((profile as { suspended?: boolean } | null)?.suspended) return redirectTo("/", "?suspended=1");

  if (isAdminArea && role !== "admin") return redirectTo("/");
  if (isGuestArea && role !== "guest") return redirectTo("/");
  // Managers AND staff may use the manager dashboard.
  if (isManagerArea && role !== "manager" && role !== "staff") return redirectTo("/");

  // Managers (not staff) are gated behind approval status.
  if (isManagerArea && role === "manager") {
    const status = mv?.status as VerificationStatus | undefined;
    const onWaiting = path.startsWith("/manager/waiting");
    if (status !== "approved" && !onWaiting) return redirectTo("/manager/waiting");
    if (status === "approved" && onWaiting) return redirectTo("/manager/hotels");
  }

  return response;
}
