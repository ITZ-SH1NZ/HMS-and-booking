"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/lib/types";

// Client-side guard that complements the middleware. Renders children only
// when the signed-in user has one of the allowed roles; otherwise redirects.
export function ProtectedRoute({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && !allow.includes(profile.role)) {
      router.replace("/");
    }
  }, [loading, user, profile, allow, router]);

  if (loading || !user || (profile && !allow.includes(profile.role))) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
