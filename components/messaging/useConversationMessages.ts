"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage as apiSendMessage, markRead as apiMarkRead } from "@/app/messages/actions";
import type { Message, MessageAttachment } from "@/lib/types";

interface UseConversationMessagesOptions {
  conversationId: string | null;
  initialMessages?: Message[];
  currentUserId: string;
  currentUserRole: "guest" | "host";
  onMarkRead?: () => void;
}

const supabase = createClient();

// Global in-memory cache for conversation messages to enable instant Stale-While-Revalidate (SWR) loading
const messageCache: Record<string, Message[]> = {};

export function useConversationMessages({
  conversationId,
  initialMessages = [],
  currentUserId,
  currentUserRole,
  onMarkRead,
}: UseConversationMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [prevConversationId, setPrevConversationId] = useState<string | null>(conversationId);
  const [loading, setLoading] = useState(false);
  const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
  
  const activeConversationIdRef = useRef<string | null>(conversationId);
  const onMarkReadRef = useRef<(() => void) | undefined>(onMarkRead);
  const initialMessagesRef = useRef<Message[]>(initialMessages);

  // Keep initialMessagesRef updated
  useEffect(() => {
    initialMessagesRef.current = initialMessages;
  }, [initialMessages]);

  // React 19 State sync during render phase (prevents cascading renders)
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    
    // Check if we have cached messages for this conversation (SWR)
    const cached = conversationId ? messageCache[conversationId] : null;
    if (cached) {
      setMessages(cached);
    } else {
      const matchingInitial =
        conversationId &&
        initialMessages.length > 0 &&
        initialMessages[0].conversation_id === conversationId;
      setMessages(matchingInitial ? initialMessages : []);
    }
  }

  // Keep refs up-to-date to avoid stale closures in subscriptions
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    onMarkReadRef.current = onMarkRead;
  }, [onMarkRead]);

  // Handle marking read
  const triggerMarkRead = useCallback(async (id: string) => {
    try {
      await apiMarkRead(id);
      if (onMarkReadRef.current) {
        onMarkReadRef.current();
      }
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  }, []);

  // 1. Fetch messages on conversation change (with SWR caching)
  useEffect(() => {
    if (!conversationId) return;
    const refinedId: string = conversationId;
    const currentInitials = initialMessagesRef.current;

    const hasCache = !!messageCache[refinedId];

    // Seed from initialMessages if no cache yet
    if (!hasCache && currentInitials.length > 0 && currentInitials[0].conversation_id === refinedId) {
      messageCache[refinedId] = currentInitials;
      setMessages(currentInitials);
      triggerMarkRead(refinedId);
      return;
    }

    let active = true;
    
    // Only show loading spinner if we don't have cached messages
    if (!hasCache) {
      setLoading(true);
    }

    async function loadMessages() {
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", refinedId)
          .order("created_at", { ascending: true });

        if (active && data) {
          // Update cache
          messageCache[refinedId] = data;
          setMessages(data);
          triggerMarkRead(refinedId);
        }
      } catch (err) {
        console.error("Failed to load messages on client:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      active = false;
    };
  }, [conversationId, triggerMarkRead]);

  // 2. Realtime subscription (Postgres Changes + Broadcast Typing)
  useEffect(() => {
    if (!conversationId) return;
    const refinedId: string = conversationId;

    const channelName = `room-${refinedId}`;
    const channel = supabase.channel(channelName);

    channel
      // A. Listen for new messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${refinedId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          const activeId = activeConversationIdRef.current;
          if (!activeId || newMsg.conversation_id !== activeId) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const next = [...prev, newMsg];
            // Update SWR cache
            messageCache[activeId] = next;
            return next;
          });

          // Mark as read if received in active thread
          triggerMarkRead(activeId);
        }
      )
      // B. Listen for typing status (Broadcast)
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload;
        if (userId !== currentUserId) {
          setIsOtherPartyTyping(isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsOtherPartyTyping(false);
    };
  }, [conversationId, currentUserId, triggerMarkRead]);

  // 3. Send message action with optimistic updates
  const sendMessage = async (body: string | null, attachments: MessageAttachment[]) => {
    if (!conversationId) return;

    const tempId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_role: currentUserRole,
      body,
      attachments,
      created_at: new Date().toISOString(),
      read_at: null,
      sending: true, // Optimistic flag
    };

    // Append optimistic message and update cache
    setMessages((prev) => {
      const next = [...prev, optimisticMsg];
      messageCache[conversationId] = next;
      return next;
    });

    try {
      const message = await apiSendMessage(conversationId, body, attachments, tempId);
      
      // Replace optimistic message with actual message and update cache
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? message : m));
        messageCache[conversationId] = next;
        return next;
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error and update cache
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== tempId);
        messageCache[conversationId] = next;
        return next;
      });
      throw err;
    }
  };

  // 4. Send typing status broadcast
  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      supabase.channel(`room-${conversationId}`).send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping },
      });
    },
    [conversationId, currentUserId]
  );

  return {
    messages,
    loading,
    isOtherPartyTyping,
    sendMessage,
    sendTypingStatus,
  };
}
