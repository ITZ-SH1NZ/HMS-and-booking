"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage as apiSendMessage, markRead as apiMarkRead } from "@/app/messages/actions";
import type { Message, MessageAttachment } from "@/lib/types";

const supabase = createClient();

interface UseConversationMessagesOptions {
  conversationId: string | null;
  initialMessages: Message[];
  currentUserId: string;
  currentUserRole: "guest" | "host";
  onMarkRead?: () => void;
}

export function useConversationMessages({
  conversationId,
  initialMessages,
  currentUserId,
  currentUserRole,
  onMarkRead,
}: UseConversationMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [prevConversationId, setPrevConversationId] = useState<string | null>(conversationId);
  const [loading, setLoading] = useState(false);
  const [isOtherPartyTyping, setIsOtherPartyTyping] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId);
  const onMarkReadRef = useRef<(() => void) | undefined>(onMarkRead);

  // React 19 State sync during render phase (prevents cascading renders)
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    // If we have initialMessages that match this conversation, seed them, otherwise clear messages
    const matchingInitial =
      conversationId &&
      initialMessages.length > 0 &&
      initialMessages[0].conversation_id === conversationId;
    setMessages(matchingInitial ? initialMessages : []);
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

  // 1. Fetch messages on conversation change (only if not seeded by initialMessages)
  useEffect(() => {
    if (!conversationId) return;
    const refinedId: string = conversationId;

    // If already seeded by initialMessages, just mark read and skip fetch
    if (initialMessages.length > 0 && initialMessages[0].conversation_id === refinedId) {
      triggerMarkRead(refinedId);
      return;
    }

    let active = true;
    async function loadMessages() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", refinedId)
          .order("created_at", { ascending: true });

        if (active && data) {
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
  }, [conversationId, initialMessages, triggerMarkRead]);

  // 2. Realtime subscription (Postgres Changes + Broadcast Typing)
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `conv:${conversationId}`;
    const channel = supabase
      .channel(channelName)
      // Listen for database inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          setMessages((prev) => {
            // Deduplicate: If message is already present, just update its status (non-optimistic)
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) {
              return prev.map((m) => (m.id === newMsg.id ? { ...newMsg, sending: false } : m));
            }
            return [...prev, { ...newMsg, sending: false }];
          });

          // Mark read if it's the active conversation and from the other party
          if (
            activeConversationIdRef.current === conversationId &&
            newMsg.sender_role !== currentUserRole
          ) {
            triggerMarkRead(conversationId);
          }
        }
      )
      // Listen for typing broadcast
      .on("broadcast", { event: "typing" }, (payload) => {
        const { senderId, isTyping } = payload.payload;
        if (senderId !== currentUserId) {
          setIsOtherPartyTyping(isTyping);
          
          // Auto-clear typing indicator after 3.5s of inactivity
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherPartyTyping(false);
            }, 3500);
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Fetch any missed messages during a brief disconnect
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .then(({ data }) => {
              if (data) {
                setMessages((prev) => {
                  const merged = [...prev];
                  data.forEach((msg) => {
                    const idx = merged.findIndex((m) => m.id === msg.id);
                    if (idx !== -1) {
                      merged[idx] = { ...msg, sending: false };
                    } else {
                      merged.push({ ...msg, sending: false });
                    }
                  });
                  return merged.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                });
              }
            });
        }
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserRole, currentUserId, triggerMarkRead]);

  // 3. Send Typing Status Broadcast
  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      
      const channel = supabase.channel(`conv:${conversationId}`);
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { senderId: currentUserId, isTyping },
      });
    },
    [conversationId, currentUserId]
  );

  // 4. Optimistic Send
  const sendMessage = useCallback(
    async (body: string | null, attachments: MessageAttachment[]) => {
      if (!conversationId) return;

      const messageId = crypto.randomUUID();
      const optimisticMsg: Message = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_role: currentUserRole,
        body,
        attachments,
        read_at: null,
        created_at: new Date().toISOString(),
        sending: true,
      };

      // Append optimistic message immediately
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        // Send typing status as false since we've sent the message
        sendTypingStatus(false);

        const savedMsg = await apiSendMessage(conversationId, body, attachments, messageId);

        // Reconcile: replace optimistic message with the saved one
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...savedMsg, sending: false } : m))
        );
      } catch (err) {
        // Rollback on failure
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        throw err;
      }
    },
    [conversationId, currentUserId, currentUserRole, sendTypingStatus]
  );

  return {
    messages,
    loading,
    isOtherPartyTyping,
    sendMessage,
    sendTypingStatus,
  };
}
