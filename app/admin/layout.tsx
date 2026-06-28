import { redirect } from "next/navigation";
import { getManagerContext } from "@/lib/authServer";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await getManagerContext();
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", userId).single();
  if (profile?.role !== "admin") redirect("/");

  return <AdminShell userName={profile?.full_name || "Admin"}>{children}</AdminShell>;
}
