"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getOrCreateConversation(hotelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Find or create conversation for the guest and hotel
  const { data: existing, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("hotel_id", hotelId)
    .eq("guest_id", user.id)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      hotel_id: hotelId,
      guest_id: user.id,
    })
    .select("id")
    .single();

  if (createError) {
    console.error("Failed to create conversation:", createError);
    throw new Error(createError.message);
  }

  return created.id;
}

export async function sendMessage(
  conversationId: string,
  body: string | null,
  attachments: any[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Fetch the conversation to resolve the sender's role
  const { data: conversation, error: convErr } = await supabase
    .from("conversations")
    .select("guest_id")
    .eq("id", conversationId)
    .single();

  if (convErr || !conversation) {
    throw new Error("Conversation not found or unauthorized");
  }

  const senderRole = conversation.guest_id === user.id ? "guest" : "host";

  // Insert the message
  const { data: message, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: senderRole,
      body: body || null,
      attachments: attachments,
    })
    .select("*")
    .single();

  if (msgErr) {
    console.error("Failed to send message:", msgErr);
    throw new Error(msgErr.message);
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages`);
  revalidatePath(`/manager/messages`);

  return message;
}

export async function markRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("guest_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return;
  }

  const isGuest = conversation.guest_id === user.id;
  const updateData = isGuest ? { guest_unread: 0 } : { host_unread: 0 };

  await supabase
    .from("conversations")
    .update(updateData)
    .eq("id", conversationId);

  revalidatePath(`/messages`);
  revalidatePath(`/manager/messages`);
}

export async function setResolved(conversationId: string, resolved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const status = resolved ? "resolved" : "open";

  const { error } = await supabase
    .from("conversations")
    .update({ status })
    .eq("id", conversationId);

  if (error) {
    console.error("Failed to update status:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/messages`);
  revalidatePath(`/manager/messages`);
}
