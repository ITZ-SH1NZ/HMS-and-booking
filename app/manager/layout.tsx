import { redirect } from "next/navigation";
import { getManagerContext } from "@/lib/authServer";
import { ManagerShell, type ShellHotel } from "@/components/manager/ManagerShell";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await getManagerContext();
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  const role = (profile?.role as UserRole) ?? "guest";

  // Managers see hotels they own; staff see hotels they're assigned to.
  let hotels: ShellHotel[] = [];
  let staffPermissions: string[] = [];
  if (role === "manager") {
    const { data } = await supabase
      .from("hotels")
      .select("id, name, status")
      .eq("manager_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    hotels = (data as ShellHotel[] | null) ?? [];
  } else if (role === "staff") {
    const { data: staffData } = await supabase
      .from("hotel_staff")
      .select("permissions, hotels(id, name, status)")
      .eq("staff_id", userId);
    hotels = ((staffData ?? []) as any[]).flatMap((r) =>
      r.hotels ? (Array.isArray(r.hotels) ? r.hotels : [r.hotels]) : [],
    );
    staffPermissions = Array.from(
      new Set(((staffData ?? []) as any[]).flatMap((r) => r.permissions ?? [])),
    );
  }

  const userName = profile?.full_name || "Account";

  return (
    <ManagerShell role={role} hotels={hotels} userName={userName} staffPermissions={staffPermissions}>
      {children}
    </ManagerShell>
  );
}
