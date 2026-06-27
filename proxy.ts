import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" convention to "proxy".
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only run on the protected route groups. Public pages (home, /hotels,
  // listings, auth) skip middleware entirely — no auth round-trip — and the
  // browser Supabase client refreshes its own token. API routes self-auth.
  matcher: ["/dashboard/:path*", "/manager/:path*", "/admin/:path*"],
};
