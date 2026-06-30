import { redirect } from "next/navigation";
import { getManagerContext } from "@/lib/authServer";
import { UserRole, Conversation } from "@/lib/types";
import MessagesClient from "./MessagesClient";

export const dynamic = "force-dynamic";

export interface ManagedHotel {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
}

export default async function ManagerMessagesPage() {
  const { supabase, userId } = await getManagerContext();
  if (!userId) redirect("/login");

  // Get user profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = (profile?.role as UserRole) ?? "guest";
  if (role !== "manager" && role !== "staff") {
    redirect("/login");
  }

  // Fetch hotels that the user can manage
  let hotels: ManagedHotel[] = [];
  if (role === "manager") {
    const { data } = await supabase
      .from("hotels")
      .select("id, name, location, image_url")
      .eq("manager_id", userId)
      .is("deleted_at", null);
    hotels = data ?? [];
  } else if (role === "staff") {
    // Staff can only manage hotels they are assigned to
    const { data } = await supabase
      .from("hotel_staff")
      .select("hotels(id, name, location, image_url)")
      .eq("staff_id", userId);
    
    const rawStaff = data as unknown as { hotels: ManagedHotel | ManagedHotel[] | null }[];
    hotels = (rawStaff ?? [])
      .map((d) => {
        if (!d.hotels) return null;
        return Array.isArray(d.hotels) ? d.hotels[0] : d.hotels;
      })
      .filter((h): h is ManagedHotel => h !== null);
  }

  const hotelIds = hotels.map((h) => h.id);

  // Fetch conversations for these hotels
  let initialConversations: Conversation[] = [];
  if (hotelIds.length > 0) {
    const { data } = await supabase
      .from("conversations")
      .select(`
        *,
        hotels (
          id,
          name,
          location,
          image_url
        ),
        profiles: guest_id (
          id,
          full_name,
          phone
        )
      `)
      .in("hotel_id", hotelIds)
      .order("last_message_at", { ascending: false });

    initialConversations = (data as unknown as Conversation[]) ?? [];
  }

  return (
    <MessagesClient
      initialConversations={initialConversations}
      hotels={hotels}
      currentUserId={userId}
      currentUserRole="host"
    />
  );
}
