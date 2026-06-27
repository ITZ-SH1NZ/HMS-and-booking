import { redirect } from "next/navigation";

// The manager dashboard was reorganised into Hotels / Manage / Staff sections.
// Keep this route working for existing links by sending it to Hotels.
export default function ManagerDashboardPage() {
  redirect("/manager/hotels");
}
