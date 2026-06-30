import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GuestMessagesClient from "./GuestMessagesClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ c?: string }>;
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
  const { c: activeConversationId } = await searchParams;

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
        profiles: manager_id (
          full_name
        )
      )
    `)
    .eq("guest_id", user.id)
    .order("last_message_at", { ascending: false });

  const conversations = conversationsData ?? [];

  // Fetch messages if a conversation is active
  let initialMessages: any[] = [];
  if (activeConversationId) {
    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true });

    initialMessages = messagesData ?? [];
  }

  return (
    <GuestMessagesClient
      initialConversations={conversations}
      initialMessages={initialMessages}
      activeConversationId={activeConversationId || null}
      currentUserId={user.id}
      currentUserRole="guest"
    />
  );
}
