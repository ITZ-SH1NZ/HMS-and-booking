"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, ArrowLeft, Building, Clock } from "lucide-react";
import { sendMessage, markRead } from "@/app/messages/actions";
import ChatThread from "@/components/messaging/ChatThread";
import Composer from "@/components/messaging/Composer";
import type { Conversation, Message } from "@/lib/types";

interface GuestMessagesClientProps {
  initialConversations: Conversation[];
  initialMessages: Message[];
  activeConversationId: string | null;
  currentUserId: string;
  currentUserRole: "guest" | "host";
}

const supabase = createClient();

export default function GuestMessagesClient({
  initialConversations,
  initialMessages,
  activeConversationId,
  currentUserId,
  currentUserRole,
}: GuestMessagesClientProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Sync initialConversations on change
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  // Sync messages when active conversation changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, activeConversationId]);

  // Realtime subscription for conversation list updates (ordering and badges)
  useEffect(() => {
    const channel = supabase
      .channel("guest-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `guest_id=eq.${currentUserId}`,
        },
        async () => {
          // Refetch conversations to ensure joins (hotel and manager name) are fetched
          const { data } = await supabase
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
            .eq("guest_id", currentUserId)
            .order("last_message_at", { ascending: false });

          if (data) {
            setConversations(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Mark read when thread is opened
  useEffect(() => {
    if (!activeConversationId) return;

    const conversationId = activeConversationId;

    async function handleMarkRead() {
      // Mark read on server
      await markRead(conversationId);
      
      // Update local state instantly
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, guest_unread: 0 } : c
        )
      );
    }

    handleMarkRead();
  }, [activeConversationId]);

  const handleSend = async (body: string | null, attachments: any[]) => {
    if (!activeConversationId) return;
    await sendMessage(activeConversationId, body, attachments);
  };

  // Host initials for selected avatar
  const hostInitials = useMemo(() => {
    const name = activeConversation?.hotels?.profiles?.full_name;
    if (name) {
      return name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return "H";
  }, [activeConversation]);

  // Format date helper for rows
  const formatLastMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="mx-auto w-full h-[calc(100vh-4rem)] max-w-5xl px-4 py-6 sm:px-6 flex gap-4 overflow-hidden">
      {/* COLUMN 1: Conversation List */}
      <div
        className={`w-full md:w-80 shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs ${
          activeConversationId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-slate-150">
          <h1 className="text-lg font-black text-slate-900 font-serif tracking-tight flex items-center gap-1.5">
            <MessageSquare className="h-5 w-5 text-brand-650" /> Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-xs font-semibold">No conversations found.</p>
              <p className="text-[10px] mt-1">Start a conversation from a hotel details page.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const initials = c.hotels?.name
                ? c.hotels.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "H";
              
              const isActive = c.id === activeConversationId;
              const hasUnread = c.guest_unread > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/messages?c=${c.id}`)}
                  className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50/50 transition duration-200 outline-none ${
                    isActive ? "bg-brand-50/40 border-l-4 border-brand-600 pl-3.5" : ""
                  }`}
                >
                  {/* Hotel avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner uppercase">
                    {initials}
                  </div>

                  {/* Body preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span className="block text-xs font-bold text-slate-900 truncate">
                        {c.hotels?.name || "Hotel Manager"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatLastMessageTime(c.last_message_at)}
                      </span>
                    </div>

                    <p className={`text-xs mt-1 truncate ${
                      hasUnread ? "font-bold text-slate-900" : "text-slate-500"
                    }`}>
                      {c.last_message_preview || "No messages yet"}
                    </p>
                  </div>

                  {/* Badges */}
                  {hasUnread && (
                    <div className="self-center shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white leading-none shadow-sm">
                      {c.guest_unread}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: Message Thread */}
      <div
        className={`flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs ${
          activeConversationId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Header info */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => router.push("/messages")}
                  className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center font-bold text-white text-xs shadow-inner uppercase">
                  {hostInitials}
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    {activeConversation.hotels?.name || "Hotel Host"}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> {activeConversation.hotels?.location}
                  </p>
                </div>
              </div>

              {activeConversation.status === "resolved" && (
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Resolved
                </span>
              )}
            </div>

            {/* Message window */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                <Clock className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : (
              <ChatThread
                conversationId={activeConversation.id}
                initialMessages={messages}
                currentUserRole="guest"
                otherPartyInitials={hostInitials}
              />
            )}

            {/* Composer */}
            <Composer
              conversationId={activeConversation.id}
              onSend={handleSend}
              disabled={activeConversation.status === "resolved"}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-slate-50/50">
            <MessageSquare className="h-10 w-10 text-slate-350" />
            <p className="mt-3 text-sm font-bold text-slate-450">Select a message thread</p>
            <p className="text-xs text-slate-400 mt-1">Choose a conversation from the list to start chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
