"use client";

import { useState, useEffect, useRef, UIEvent } from "react";
import type { Message } from "@/lib/types";
import { Clock, Check, CheckCheck, ChevronDown, X, ZoomIn } from "lucide-react";

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

  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 150;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
    );
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollEndRef.current?.scrollIntoView({ behavior });
    setShowScrollPill(false);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 50;
    
    if (isAtBottom) {
      setShowScrollPill(false);
    }
  };

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
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        setTimeout(() => {
          setShowScrollPill(true);
        }, 0);
      }
    } else if (isOtherPartyTyping && isNearBottom()) {
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  }, [messages, isOtherPartyTyping, currentUserRole]);

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      setTimeout(() => scrollToBottom("auto"), 50);
    }
  }, [messages.length]);

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
        dayStr = date.toLocaleDateString("en-US", {
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
    return new Date(isoString).toLocaleTimeString("en-US", {
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F9FA] relative overflow-hidden">
      
      {/* Scrollable Message Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar relative z-10"
      >
        {messageGroups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 border border-slate-200/60">
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No messages yet</h3>
            <p className="text-xs text-slate-500 mt-1">Type a message below to start chatting.</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.day} className="space-y-5">
              {/* Day Separator */}
              <div className="flex justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-md">
                  {group.day}
                </span>
              </div>

              {/* Messages List */}
              <div className="space-y-4">
                {group.messages.map((msg) => {
                  const isOwn = msg.sender_role === currentUserRole;
                  const isSending = msg.sending;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 items-start ${
                        isOwn ? "justify-end" : "justify-start"
                      } animate-fade-in-up`}
                    >
                      {/* Avatar on the left for guest */}
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 uppercase border border-slate-350/10 shadow-3xs mt-0.5">
                          {otherPartyInitials}
                        </div>
                      )}

                      {/* Bubble + Timestamp Wrapper */}
                      <div className={`flex flex-col max-w-[70%] sm:max-w-[60%] ${isOwn ? "items-end" : "items-start"}`}>
                        
                        {/* Bubble Body */}
                        {(() => {
                          const hasOnlyAttachments = msg.attachments && msg.attachments.length > 0 && !msg.body;
                          return (
                            <div
                              className={`transition-all ${
                                hasOnlyAttachments
                                  ? ""
                                  : `p-3.5 rounded-2xl shadow-3xs ${
                                      isOwn
                                        ? "bg-[#0A4335] text-white"
                                        : "bg-[#F8F6F2] text-slate-850"
                                    }`
                              } ${isSending ? "opacity-75 animate-pulse" : ""}`}
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
                                        className="relative cursor-zoom-in overflow-hidden rounded-2xl border border-black/5 hover:opacity-95 active:scale-[0.98] transition shadow-3xs"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={displayUrl}
                                          alt="Attachment"
                                          className="max-h-64 w-full object-cover rounded-2xl"
                                          style={{
                                            width: att.width ? `${att.width}px` : "auto",
                                            height: att.height ? `${att.height}px` : "auto",
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                                          <ZoomIn className="h-4.5 w-4.5 text-white" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Text */}
                              {msg.body && (
                                <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap font-medium tracking-wide">
                                  {msg.body}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Timestamp BELOW the bubble */}
                        <div
                          className={`flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-400 ${
                            isOwn ? "pr-1" : "pl-1"
                          }`}
                        >
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isOwn && (
                            <span>
                              {isSending ? (
                                <Clock className="h-3 w-3 animate-spin" />
                              ) : msg.read_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-slate-400" />
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
          <div className="flex gap-3 items-start justify-start animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 uppercase border border-slate-350/10 shadow-3xs mt-0.5">
              {otherPartyInitials}
            </div>
            
            <div className="bg-[#F1F3F5] text-slate-800 rounded-2xl p-3.5 shadow-3xs flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
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
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-[10px] font-bold text-white shadow-lg hover:bg-brand-850 active:scale-95 transition-all cursor-pointer z-10 animate-bounce tracking-wider uppercase"
        >
          <span>New Messages</span>
          <ChevronDown className="h-3.5 w-3.5 text-white" />
        </button>
      )}

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition cursor-pointer border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
