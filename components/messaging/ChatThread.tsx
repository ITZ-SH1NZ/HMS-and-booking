"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { Clock, Check, CheckCheck } from "lucide-react";

interface ChatThreadProps {
  conversationId: string;
  initialMessages: Message[];
  currentUserRole: "guest" | "host";
  otherPartyInitials: string;
}

const supabase = createClient();

export default function ChatThread({
  conversationId,
  initialMessages,
  currentUserRole,
  otherPartyInitials,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [prevInitialMessages, setPrevInitialMessages] = useState<Message[]>(initialMessages);
  const [prevConversationId, setPrevConversationId] = useState<string>(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync state with initialMessages during render phase (React 19 pattern)
  if (initialMessages !== prevInitialMessages || conversationId !== prevConversationId) {
    setMessages(initialMessages);
    setPrevInitialMessages(initialMessages);
    setPrevConversationId(conversationId);
  }

  // Scroll to bottom on load/new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as Message;
          setMessages((prev) => {
            // Deduplicate: if we already have this message (e.g. optimistically or loaded)
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            
            // Reconcile optimistic message: if there's an optimistic message with the same body/attachments, replace it
            const optimisticIdx = prev.findIndex(
              (m) =>
                (m as Message & { sending?: boolean }).sending &&
                m.body === newMsg.body &&
                JSON.stringify(m.attachments) === JSON.stringify(newMsg.attachments)
            );

            if (optimisticIdx !== -1) {
              const updated = [...prev];
              updated[optimisticIdx] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Group messages by calendar day
  const groupMessagesByDay = (msgs: Message[]) => {
    const groups: { day: string; messages: Message[] }[] = [];
    msgs.forEach((msg) => {
      const date = new Date(msg.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dayStr = "";
      if (date.toDateString() === today.toDateString()) {
        dayStr = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dayStr = "Yesterday";
      } else {
        dayStr = date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      const existingGroup = groups.find((g) => g.day === dayStr);
      if (existingGroup) {
        existingGroup.messages.push(msg);
      } else {
        groups.push({ day: dayStr, messages: [msg] });
      }
    });
    return groups;
  };

  const messageGroups = groupMessagesByDay(messages);

  const formatMessageTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 bg-slate-50/50 space-y-6">
      {messageGroups.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center p-6">
          <p className="text-sm font-semibold text-slate-400">No messages yet.</p>
          <p className="text-xs text-slate-400 mt-1">Send a message to start the conversation.</p>
        </div>
      ) : (
        messageGroups.map((group) => (
          <div key={group.day} className="space-y-4">
            {/* Day Separator */}
            <div className="flex justify-center">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider shadow-xs">
                {group.day}
              </span>
            </div>

            {/* Messages in Day */}
            <div className="space-y-3.5">
              {group.messages.map((msg) => {
                const isOwn = msg.sender_role === currentUserRole;
                const isSending = (msg as Message & { sending?: boolean }).sending;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Other avatar */}
                    {!isOwn && (
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600 border border-slate-300">
                        {otherPartyInitials}
                      </div>
                    )}

                    {/* Bubble body */}
                    <div
                      className={`max-w-[70%] sm:max-w-[60%] flex flex-col gap-1.5 p-3 sm:p-3.5 shadow-xs border ${
                        isOwn
                          ? "bg-brand-700 border-brand-850 text-white rounded-2xl rounded-br-xs"
                          : "bg-white border-slate-200 text-slate-800 rounded-2xl rounded-bl-xs"
                      } ${isSending ? "opacity-70 animate-pulse" : ""}`}
                    >
                      {/* Image attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-xl border border-black/10 hover:opacity-90 active:scale-98 transition aspect-auto"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.url}
                                alt="Attachment"
                                className="max-h-60 object-cover rounded-xl"
                                style={{
                                  width: att.width ? `${att.width}px` : "auto",
                                  height: att.height ? `${att.height}px` : "auto",
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.body && (
                        <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
                          {msg.body}
                        </p>
                      )}

                      {/* Metadata row */}
                      <div
                        className={`flex items-center gap-1.5 justify-end text-[9px] font-bold ${
                          isOwn ? "text-brand-200" : "text-slate-400"
                        }`}
                      >
                        <span>{formatMessageTime(msg.created_at)}</span>
                        {isOwn && (
                          <span>
                            {isSending ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : msg.read_at ? (
                              <CheckCheck className="h-3 w-3 text-brand-300" />
                            ) : (
                              <Check className="h-3 w-3 text-brand-300" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <div ref={scrollRef} />
    </div>
  );
}
