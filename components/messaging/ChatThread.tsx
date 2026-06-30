"use client";

import { useState, useEffect, useRef, UIEvent } from "react";
import type { Message } from "@/lib/types";
import { Clock, Check, CheckCheck, ChevronDown, X } from "lucide-react";

interface ChatThreadProps {
  messages: Message[];
  currentUserRole: "guest" | "host";
  otherPartyInitials: string;
  isOtherPartyTyping?: boolean;
}

export default function ChatThread({
  messages,
  currentUserRole,
  otherPartyInitials,
  isOtherPartyTyping = false,
}: ChatThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const prevMessagesCountRef = useRef(messages.length);
  const initialScrollDoneRef = useRef(false);

  // Helper to determine if user is near bottom
  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 150; // px from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
    );
  };

  // Scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollEndRef.current?.scrollIntoView({ behavior });
    setShowScrollPill(false);
  };

  // Handle container scroll event
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 50;
    
    if (isAtBottom) {
      setShowScrollPill(false);
    }
  };

  // Scroll on new messages or typing indicator changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevCount = prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;
    const hasNewMessage = messages.length > prevCount;

    if (hasNewMessage) {
      const lastMessage = messages[messages.length - 1];
      const wasSentByMe = lastMessage.sender_role === currentUserRole;

      if (wasSentByMe || isNearBottom()) {
        // If sent by current user or already at bottom, scroll down
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        // If sent by other party and user has scrolled up, show the new message pill
        setTimeout(() => {
          setShowScrollPill(true);
        }, 0);
      }
    } else if (isOtherPartyTyping && isNearBottom()) {
      // Scroll to bottom if typing indicator appears while at bottom
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  }, [messages, isOtherPartyTyping, currentUserRole]);

  // Initial scroll to bottom on mount/first load
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      setTimeout(() => scrollToBottom("auto"), 50);
    }
  }, [messages.length]);

  // Group messages by day
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

  const getAttachmentUrl = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `/api/messages/attachment?path=${encodeURIComponent(url)}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F7F4] relative">
      {/* Scrollable Message Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 custom-scrollbar"
      >
        {messageGroups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-brand-600" />
            </div>
            <p className="text-sm font-bold text-slate-700 font-serif">No messages yet</p>
            <p className="text-xs text-slate-455 mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.day} className="space-y-4">
              {/* Day Separator */}
              <div className="flex justify-center">
                <span className="rounded-full bg-slate-200/60 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest shadow-xs">
                  {group.day}
                </span>
              </div>

              {/* Messages List */}
              <div className="space-y-1">
                {group.messages.map((msg, index) => {
                  const isOwn = msg.sender_role === currentUserRole;
                  const isSending = msg.sending;

                  // Consecutive grouping logic
                  const prevMsg = index > 0 ? group.messages[index - 1] : null;
                  const isConsecutive =
                    prevMsg &&
                    prevMsg.sender_role === msg.sender_role &&
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() <
                      5 * 60 * 1000; // 5 minutes threshold

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${
                        isOwn ? "justify-end" : "justify-start"
                      } ${isConsecutive ? "mt-1" : "mt-4"}`}
                    >
                      {/* Avatar column (only show for other sender if not consecutive) */}
                      {!isOwn && (
                        <div className="w-8 shrink-0 flex justify-center">
                          {!isConsecutive ? (
                            <div className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-brand-50 text-[10px] font-black text-brand-800 border border-brand-200/60 shadow-sm uppercase">
                              {otherPartyInitials}
                            </div>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      )}

                      {/* Bubble Body */}
                      <div
                        className={`max-w-[70%] sm:max-w-[60%] flex flex-col gap-1.5 p-3 sm:p-3.5 shadow-xs border ${
                          isOwn
                            ? "bg-brand-700 border-brand-850 text-white rounded-2xl rounded-br-xs"
                            : "bg-white border-slate-200 text-slate-800 rounded-2xl rounded-bl-xs"
                        } ${isSending ? "opacity-70 animate-pulse" : ""} ${
                          isConsecutive && isOwn
                            ? "rounded-br-2xl"
                            : isConsecutive && !isOwn
                            ? "rounded-bl-2xl"
                            : ""
                        }`}
                      >
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="grid grid-cols-1 gap-2">
                            {msg.attachments.map((att, idx) => {
                              const displayUrl = getAttachmentUrl(att.url);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setLightboxImage(displayUrl)}
                                  className="cursor-zoom-in overflow-hidden rounded-xl border border-black/10 hover:opacity-95 active:scale-99 transition aspect-auto"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={displayUrl}
                                    alt="Attachment"
                                    className="max-h-64 w-full object-cover rounded-xl"
                                    style={{
                                      width: att.width ? `${att.width}px` : "auto",
                                      height: att.height ? `${att.height}px` : "auto",
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Text */}
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

        {/* Typing Indicator */}
        {isOtherPartyTyping && (
          <div className="flex items-end gap-2.5 justify-start mt-4">
            <div className="w-8 shrink-0 flex justify-center">
              <div className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-brand-50 text-[10px] font-black text-brand-800 border border-brand-200/60 shadow-sm uppercase">
                {otherPartyInitials}
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-xs p-3.5 shadow-xs flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Pill */}
      {showScrollPill && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-brand-850 active:scale-95 transition cursor-pointer z-10 animate-bounce"
        >
          <span>New Messages</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 transition-opacity duration-300"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
