import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GuestMessagesClient from "./GuestMessagesClient";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ c?: string; back?: string; hotelId?: string }>;
}

export default async function GuestMessagesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/messages");
  }

  // Resolve search parameters (Promise in Next.js 15+)
  const { c: activeConversationId, back, hotelId } = await searchParams;

  // Fetch all conversations for this guest
  const { data: conversationsData } = await supabase
    .from("conversations")
    .select(`
      *,
      hotels (
        id,
        name,
        location,
        image_url,
        manager_id,
        profiles: manager_id (
          id,
          full_name,
          phone
        )
      )
    `)
    .eq("guest_id", user.id)
    .order("last_message_at", { ascending: false });

  const conversations = conversationsData ?? [];

  // Fetch messages if a conversation is active
  let initialMessages: Message[] = [];
  if (activeConversationId) {
    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true });

    initialMessages = messagesData ?? [];
  }

  // Fetch host email securely on the server using admin client
  let hostEmail: string | null = null;
  if (activeConversationId && conversations.length > 0) {
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    const managerId = activeConv?.hotels?.profiles?.id || activeConv?.hotels?.manager_id;
    if (managerId) {
      try {
        const admin = createAdminClient();
        const { data: userData } = await admin.auth.admin.getUserById(managerId);
        if (userData?.user) {
          hostEmail = userData.user.email || null;
        }
      } catch (err) {
        console.error("Failed to fetch host email via admin client:", err);
      }
    }
  }

  return (
    <GuestMessagesClient
      initialConversations={conversations}
      initialMessages={initialMessages}
      activeConversationId={activeConversationId || null}
      currentUserId={user.id}
      currentUserRole="guest"
      back={back || null}
      hotelId={hotelId || null}
      hostEmail={hostEmail}
    />
  );
}
