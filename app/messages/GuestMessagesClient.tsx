"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  MessageSquare, 
  ArrowLeft, 
  Building, 
  Clock, 
  HelpCircle, 
  ExternalLink, 
  ChevronRight, 
  Phone, 
  Mail, 
  Share2, 
  AlertTriangle, 
  MoreVertical, 
  Info, 
  X, 
  Check, 
  VolumeX,
  Volume2
} from "lucide-react";
import { useConversationMessages } from "@/components/messaging/useConversationMessages";
import ChatThread from "@/components/messaging/ChatThread";
import Composer from "@/components/messaging/Composer";
import type { Conversation, Message, Booking } from "@/lib/types";

interface GuestMessagesClientProps {
  initialConversations: Conversation[];
  initialMessages: Message[];
  activeConversationId: string | null;
  currentUserId: string;
  currentUserRole: "guest" | "host";
  back: string | null;
  hotelId: string | null;
  hostEmail: string | null;
}

const supabase = createClient();

const WHATSAPP_SVG_PATH = "M19.077 4.928A9.886 9.886 0 0 0 12.04 2c-5.433 0-9.854 4.417-9.856 9.852a9.81 9.81 0 0 0 1.32 4.967L2 22l5.302-1.39a9.82 9.82 0 0 0 4.735 1.228h.004c5.43 0 9.85-4.417 9.853-9.852a9.886 9.886 0 0 0-2.817-6.93M12.04 20.048a8.09 8.09 0 0 1-4.14-1.135l-.297-.176-3.083.808.822-3.006-.194-.308a8.095 8.095 0 0 1-1.243-4.38c0-4.466 3.64-8.102 8.112-8.102 2.164 0 4.2.843 5.73 2.376a8.046 8.046 0 0 1 2.373 5.737c-.002 4.468-3.64 8.106-8.11 8.106m4.446-6.07c-.244-.122-1.442-.712-1.666-.793-.223-.081-.385-.122-.547.122-.162.244-.629.793-.771.956-.143.162-.285.183-.529.06-.244-.12-1.03-.38-1.962-1.21-.725-.647-1.214-1.447-1.356-1.69-.142-.244-.015-.376.107-.497.11-.11.244-.285.366-.427.122-.142.162-.244.244-.407.08-.162.04-.305-.02-.426-.06-.122-.547-1.32-.75-1.81-.197-.476-.398-.41-.547-.418-.14-.007-.305-.007-.467-.007a.9.9 0 0 0-.65.305c-.223.244-.853.833-.853 2.031 0 1.198.873 2.356.995 2.519.122.162 1.717 2.622 4.16 3.678.58.252 1.034.402 1.388.514.584.185 1.116.16 1.537.097.47-.07 1.443-.59 1.646-1.159.203-.57.203-1.057.142-1.158-.06-.102-.223-.163-.467-.285";

export default function GuestMessagesClient({
  initialConversations,
  initialMessages,
  activeConversationId,
  currentUserId,
  currentUserRole,
  back,
  hotelId,
  hostEmail: propHostEmail,
}: GuestMessagesClientProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [prevInitialConversations, setPrevInitialConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(activeConversationId);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync initialConversations on change during render phase (React 19 pattern)
  if (initialConversations !== prevInitialConversations) {
    setPrevInitialConversations(initialConversations);
    setConversations(initialConversations);
  }

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Lock body scroll on mount to prevent page-level scrolling/viewport shifting
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Manage body class for hiding header/navbar on mobile when chatting
  useEffect(() => {
    if (activeConversationId) {
      document.body.classList.add("chat-active");
    } else {
      document.body.classList.remove("chat-active");
    }
    return () => {
      document.body.classList.remove("chat-active");
    };
  }, [activeConversationId]);

  // React 19 Render-phase state sync for booking reset to avoid cascading renders
  const [prevHotelId, setPrevHotelId] = useState<string | null>(null);
  const currentHotelId = activeConversation?.hotel_id || null;
  if (currentHotelId !== prevHotelId) {
    setPrevHotelId(currentHotelId);
    setBooking(null);
    if (currentHotelId) {
      setLoadingBooking(true);
    }
  }

  // Use the custom hook for messages, subscription, and optimistic sending
  const {
    messages,
    loading: loadingMessages,
    isOtherPartyTyping,
    sendMessage,
    sendTypingStatus,
  } = useConversationMessages({
    conversationId: activeId,
    initialMessages,
    currentUserId,
    currentUserRole,
    onMarkRead: () => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, guest_unread: 0 } : c
        )
      );
    },
  });

  // Realtime subscription for conversation list updates
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
                  id,
                  full_name,
                  phone
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

  // Fetch booking details for the active conversation
  useEffect(() => {
    const targetHotelId = activeConversation?.hotel_id;
    if (!targetHotelId) return;

    let active = true;

    async function fetchBooking() {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("*")
          .eq("hotel_id", targetHotelId)
          .eq("guest_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (active) {
          setLoadingBooking(false);
          if (data && data.length > 0) {
            setBooking(data[0] as Booking);
          } else {
            setBooking(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch booking:", err);
        if (active) setLoadingBooking(false);
      }
    }

    fetchBooking();
    return () => {
      active = false;
    };
  }, [activeConversation?.hotel_id, currentUserId]);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine Back URLs based on context
  const resolvedHotelId = hotelId || activeConversation?.hotel_id;
  const backUrl = back === "property" && resolvedHotelId ? `/hotels/${resolvedHotelId}` : "/";
  const backText = back === "property" ? "Back to property" : "Back to home";

  const hostProfile = activeConversation?.hotels?.profiles;
  const hostName = hostProfile?.full_name || "Hotel Host";
  const hostPhone = hostProfile?.phone;
  const hostEmail = propHostEmail;

  // Host initials for selected avatar
  const hostInitials = useMemo(() => {
    if (hostName) {
      return hostName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return "H";
  }, [hostName]);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;
    setIsReportSubmitted(true);
    setTimeout(() => {
      setIsReportOpen(false);
      setIsReportSubmitted(false);
      setReportReason("");
      alert("Thank you. Your concern has been submitted and our safety team is reviewing it.");
    }, 1500);
  };

  const handleResolve = async () => {
    if (!activeConversationId) return;
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status: "resolved" })
        .eq("id", activeConversationId);
      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, status: "resolved" } : c
        )
      );
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Failed to resolve conversation:", err);
    }
  };

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
    <div className="w-full h-dvh bg-[#FDFDFB] flex flex-col font-sans text-slate-800 antialiased overflow-hidden chat-active-height">
      
      {/* 1. Global Page Header */}
      <header className="hidden md:flex bg-white border-b border-slate-200/85 px-4 py-3 sm:px-6 md:py-4 items-center justify-between shadow-3xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-250/70 hover:bg-slate-50 text-xs font-bold text-slate-700 transition duration-200 shadow-3xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
            <span>{backText}</span>
          </button>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-550/5 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition duration-200 cursor-pointer">
          <HelpCircle className="h-3.5 w-3.5 text-slate-450" />
          <span>Need help?</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 pb-4 md:pb-6 flex flex-col gap-4 overflow-hidden">
        
        {/* Title area (Desktop only, hidden on mobile if thread is active to maximize chat space) */}
        <div className={`shrink-0 ${activeId ? "hidden md:block" : "block"}`}>
          <div className="flex items-center gap-3.5 md:block">
            <button
              onClick={() => router.push(backUrl)}
              className="md:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title={backText}
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black font-serif text-slate-900 tracking-tight">
                Messages
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Communicate with your host securely
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Workspace */}
        <div className="flex-1 flex gap-5 overflow-hidden h-full">
          
          {/* COLUMN 1: Conversation List */}
          <div
            className={`w-full md:w-85 shrink-0 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 md:opacity-100 md:pointer-events-auto ${
              activeId 
                ? "absolute translate-x-[-20%] opacity-0 pointer-events-none" 
                : "absolute translate-x-0 opacity-100 pointer-events-auto inset-0 w-full h-full"
            }`}
          >
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-150 bg-[#FBFBFA]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3.5 pr-10 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-300 focus:bg-white transition"
                />
                <button className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* Pills / Tabs */}
              <div className="flex gap-2 mt-3.5">
                <button className="px-3 py-1.5 rounded-full bg-[#0A4335]/5 text-[#0A4335] text-[11px] font-bold tracking-wide flex items-center gap-1.5 border border-[#0A4335]/15">
                  All <span className="bg-[#0A4335] text-white rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none">{conversations.length}</span>
                </button>
                <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-50 text-[11px] font-bold tracking-wide">
                  Unread
                </button>
                <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-50 text-[11px] font-bold tracking-wide">
                  Active
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-[#FDFDFB]/20 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="p-12 text-center text-slate-450 animate-fade-in">
                  <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold font-serif text-slate-800">No messages yet</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto">Start a conversation from a hotel details page.</p>
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
                  
                  const isActive = c.id === activeId;
                  const hasUnread = c.guest_unread > 0;

                  // Build target click path keeping the back tracking
                  const clickPath = `/messages?c=${c.id}${back ? `&back=${back}` : ""}${hotelId ? `&hotelId=${hotelId}` : ""}`;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        window.history.replaceState(null, "", clickPath);
                      }}
                      className={`w-full p-4.5 flex gap-3.5 text-left hover:bg-[#F9F6F0]/25 transition duration-200 outline-none border-l-4 relative ${
                        isActive ? "bg-[#F9F6F0]/55 border-[#0A4335] pl-3.5" : "border-transparent"
                      }`}
                    >
                      {/* Hotel avatar */}
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-white border border-slate-150 flex items-center justify-center font-black text-slate-700 text-xs shadow-3xs uppercase">
                        {initials}
                      </div>

                      {/* Content preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1.5">
                          <span className="block text-xs font-bold text-slate-900 truncate">
                            {c.hotels?.name || "Hotel Manager"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                            {formatLastMessageTime(c.last_message_at)}
                          </span>
                        </div>

                        <p className={`text-xs mt-1 truncate ${
                          hasUnread ? "font-bold text-slate-900" : "text-slate-500"
                        }`}>
                          {c.last_message_preview || "No messages yet"}
                        </p>
                      </div>

                      {/* Unread badge */}
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
            
            {/* Load more */}
            {conversations.length > 0 && (
              <div className="p-3 border-t border-slate-100 text-center bg-[#FBFBFA]">
                <button className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition">
                  Load more conversations
                </button>
              </div>
            )}
          </div>

          {/* COLUMN 2: Message Thread */}
          <div
            className={`flex-1 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 md:opacity-100 md:pointer-events-auto ${
              activeId 
                ? "absolute translate-x-0 opacity-100 pointer-events-auto inset-0 w-full h-full" 
                : "absolute translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            {activeConversation ? (
              <>
                {/* Header info */}
                <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200/85 flex items-center justify-between bg-white shrink-0 relative z-20">
                  <div className="flex items-center gap-3.5 min-w-0">
                    
                    {/* Mobile Back Button (Returns to list) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(null);
                        const listPath = `/messages${back ? `?back=${back}` : ""}${hotelId ? `&hotelId=${hotelId}` : ""}`;
                        window.history.replaceState(null, "", listPath);
                      }}
                      className="md:hidden p-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDetailsExpanded(true)}
                      className="flex items-center gap-3.5 min-w-0 hover:opacity-80 transition cursor-pointer text-left focus:outline-none"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#0A4335] to-[#125B49] flex items-center justify-center font-bold text-white text-xs shadow-sm uppercase tracking-wider shrink-0">
                        {hostInitials}
                      </div>

                      <div className="text-left min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 font-serif truncate">
                          {activeConversation.hotels?.name || "Hotel Host"}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1 truncate">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" /> 
                          <span className="truncate">{activeConversation.hotels?.location}</span>
                        </p>
                      </div>

                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-sm" title="Online" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Details Panel */}
                    <button
                      type="button"
                      onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                      className={`p-2 rounded-full border transition cursor-pointer ${
                        isDetailsExpanded 
                          ? "bg-[#0A4335]/5 border-[#0A4335]/20 text-[#0A4335]" 
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title="Toggle details"
                    >
                      <Info className="h-4.5 w-4.5" />
                    </button>

                    {/* Three-dots actions */}
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in text-left">
                          <button
                            onClick={() => {
                              setIsMuted(!isMuted);
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition text-left"
                          >
                            {isMuted ? (
                              <>
                                <Volume2 className="h-4 w-4 text-slate-455" />
                                <span>Unmute Conversation</span>
                              </>
                            ) : (
                              <>
                                <VolumeX className="h-4 w-4 text-slate-455" />
                                <span>Mute Notifications</span>
                              </>
                            )}
                          </button>
                          
                          {activeConversation.status !== "resolved" && (
                            <button
                              onClick={handleResolve}
                              className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition text-left"
                            >
                              <Check className="h-4 w-4 text-emerald-650" />
                              <span>Mark as Resolved</span>
                            </button>
                          )}

                          <div className="h-px bg-slate-100 my-1" />

                          <button
                            onClick={() => {
                              setIsReportOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-xs text-red-650 hover:bg-red-50 flex items-center gap-2 transition text-left font-bold"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span>Report a Concern</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Safety Banner */}
                <div className="bg-[#F8F6F2] border-b border-slate-200/60 px-5 py-3 flex items-center justify-between text-left shrink-0">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
                    <p className="text-[11px] font-medium text-slate-750 leading-relaxed">
                      <strong>Start of your conversation.</strong> Please keep all payments and communication on BookNest for your safety.
                    </p>
                  </div>
                </div>

                {/* Message window */}
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center bg-[#FDFDFB]">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-6 w-6 animate-spin text-[#0A4335]" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retrieving Messages</span>
                    </div>
                  </div>
                ) : (
                  <ChatThread
                    messages={messages}
                    currentUserRole="guest"
                    otherPartyInitials={hostInitials}
                    isOtherPartyTyping={isOtherPartyTyping}
                  />
                )}

                {/* Composer */}
                <Composer
                  conversationId={activeConversation.id}
                  onSend={sendMessage}
                  disabled={activeConversation.status === "resolved"}
                  onTyping={sendTypingStatus}
                />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-[#F9F6F0]/10">
                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-3xs border border-slate-150 mb-5">
                  <MessageSquare className="h-8 w-8 text-[#0A4335]" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 font-serif tracking-tight">Your Inbox</h3>
                <p className="text-xs text-slate-450 mt-2 max-w-xs leading-relaxed">
                  Select a message thread from the sidebar to chat with the hotel host and view your stay arrangements.
                </p>
              </div>
            )}
          </div>

          {/* COLUMN 3: Details Panel (Desktop side panel or Mobile Drawer) */}
          {activeConversation && (
            <div
              className={`shrink-0 h-full bg-white border border-slate-200/80 rounded-2xl overflow-y-auto custom-scrollbar shadow-2xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isDetailsExpanded 
                  ? "w-full md:w-80 translate-x-0 absolute md:static inset-0 z-40 md:z-auto opacity-100 pointer-events-auto" 
                  : "w-0 opacity-0 pointer-events-none translate-x-full absolute md:static inset-y-0 right-0 z-40"
              }`}
            >
              {/* Drawer Mobile Close Header */}
              <div className="p-4 border-b border-slate-200 flex md:hidden items-center justify-between bg-white">
                <span className="font-bold text-sm text-slate-900 font-serif">Conversation Details</span>
                <button
                  onClick={() => setIsDetailsExpanded(false)}
                  className="p-1.5 rounded-full border border-slate-250 text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-6 text-left">
                
                {/* Section 1: About the Property */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">About the property</h3>
                  <div className="rounded-2xl border border-slate-150 overflow-hidden shadow-3xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeConversation.hotels?.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop"}
                      alt={activeConversation.hotels?.name}
                      className="h-32 w-full object-cover"
                    />
                    <div className="p-3.5 bg-[#FDFDFB]">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {activeConversation.hotels?.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {activeConversation.hotels?.location}
                      </p>
                      <button
                        onClick={() => router.push(`/hotels/${activeConversation.hotel_id}`)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-slate-750 text-[11px] font-bold bg-white hover:bg-slate-50 transition cursor-pointer"
                      >
                        <span>View Property</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Booking Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Booking Details</h3>
                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 space-y-3.5 shadow-3xs">
                    {loadingBooking ? (
                      <div className="flex justify-center py-4">
                        <Clock className="h-4 w-4 animate-spin text-[#0A4335]" />
                      </div>
                    ) : booking ? (
                      <>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-medium text-slate-450">Check-in</span>
                          <span className="text-xs font-bold text-slate-900">
                            {new Date(booking.check_in).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-medium text-slate-450">Check-out</span>
                          <span className="text-xs font-bold text-slate-900">
                            {new Date(booking.check_out).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-medium text-slate-455">Guests</span>
                          <span className="text-xs font-bold text-slate-900">{booking.guest_count} Guests</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-medium text-slate-455">Booking ID</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-750">BK-{booking.id.substring(0, 8)}</span>
                        </div>

                        <div className="h-px bg-slate-200/60 my-1" />

                        <button
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                          className="w-full flex items-center justify-between text-[#0A4335] hover:text-[#125B49] text-[11px] font-black transition cursor-pointer"
                        >
                          <span>View Booking</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inquiry / No Active Booking</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Host Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Host Details</h3>
                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 shadow-3xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs">
                        {hostInitials}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{hostName}</h4>
                        <span className="inline-block mt-0.5 bg-[#0A4335]/5 border border-[#0A4335]/15 text-[#0A4335] text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md">
                          Super Host
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {hostPhone ? (
                        <>
                          <a
                            href={`tel:${hostPhone}`}
                            className="flex flex-col sm:flex-row items-center justify-center gap-1 px-1 py-2 border border-slate-200 rounded-xl text-slate-750 text-[10px] font-bold bg-white hover:bg-slate-50 transition shadow-3xs"
                            title="Call Host"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${hostPhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col sm:flex-row items-center justify-center gap-1 px-1 py-2 border border-slate-200 rounded-xl text-slate-750 text-[10px] font-bold bg-white hover:bg-slate-50 transition shadow-3xs"
                            title="Message on WhatsApp"
                          >
                            <svg className="h-3.5 w-3.5 text-[#25D366] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d={WHATSAPP_SVG_PATH} />
                            </svg>
                            <span className="truncate">WhatsApp</span>
                          </a>
                        </>
                      ) : null}
                      {hostEmail ? (
                        <a
                          href={`mailto:${hostEmail}`}
                          className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-1 py-2 border border-slate-200 rounded-xl text-slate-750 text-[10px] font-bold bg-white hover:bg-slate-50 transition shadow-3xs ${
                            !hostPhone ? "col-span-3" : ""
                          }`}
                          title="Send Email"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>Email</span>
                        </a>
                      ) : null}
                      {!hostPhone && !hostEmail && (
                        <div className="col-span-3 text-center">
                          <span className="text-[10px] text-slate-400 font-medium">Contact details unavailable</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 4: Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Actions</h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 border border-slate-200 bg-white rounded-xl text-slate-750 text-[11px] font-bold hover:bg-slate-50 transition cursor-pointer shadow-3xs"
                    >
                      <span className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-slate-400" />
                        <span>Share Property Info</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReportOpen(true)}
                      className="w-full flex items-center justify-between p-3 border border-red-200/45 bg-red-50/20 rounded-xl text-red-650 text-[11px] font-bold hover:bg-red-50/50 transition cursor-pointer shadow-3xs"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span>Report a Concern</span>
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* REPORT A CONCERN DIALOG */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in text-left">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-base text-slate-900 font-serif">Report a Concern</span>
              <button
                onClick={() => setIsReportOpen(false)}
                className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200/55 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-xs text-red-750 leading-relaxed">
                  Help us keep BookNest safe. Select a reason below and add details to report unprofessional behavior or issues with this host.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Select a reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-slate-350 transition"
                >
                  <option value="">Choose a reason...</option>
                  <option value="no-response">Host not responding</option>
                  <option value="inaccurate">Inaccurate property information</option>
                  <option value="unprofessional">Unprofessional behavior</option>
                  <option value="payment-outside">Host requested payment outside BookNest</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Details</label>
                <textarea
                  placeholder="Please describe the issue in detail..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-slate-350 transition resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReportSubmitted || !reportReason}
                  className="flex-1 px-4 py-3 bg-red-650 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isReportSubmitted ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
