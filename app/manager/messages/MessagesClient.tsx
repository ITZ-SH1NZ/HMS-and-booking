"use client";

import { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  CheckCircle,
  Clock,
  User,
  Phone,
  Mail,
  Building,
  Calendar,
  MessageSquare,
  FileText,
  CheckSquare,
  Filter,
  ArrowLeft,
  Info,
  ChevronRight,
} from "lucide-react";
import { setResolved } from "@/app/messages/actions";
import { useConversationMessages } from "@/components/messaging/useConversationMessages";
import ChatThread from "@/components/messaging/ChatThread";
import Composer from "@/components/messaging/Composer";
import type { Conversation, Booking } from "@/lib/types";

interface MessagesClientProps {
  initialConversations: Conversation[];
  hotels: {
    id: string;
    name: string;
    location: string;
    image_url: string | null;
  }[];
  currentUserId: string;
  currentUserRole: "guest" | "host";
}

const supabase = createClient();

export default function MessagesClient({
  initialConversations,
  hotels,
  currentUserId,
  currentUserRole,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Mobile navigation state
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Filters & Search
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "resolved">("all");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Guest & Booking Details Panel State
  const [guestEmail, setGuestEmail] = useState("");
  const [bookingDetails, setBookingDetails] = useState<(Booking & { rooms: { name: string } | null }) | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Use the new custom hook for messages, subscription, and optimistic sending
  const {
    messages,
    loading: loadingMessages,
    isOtherPartyTyping,
    sendMessage,
    sendTypingStatus,
  } = useConversationMessages({
    conversationId: activeId,
    initialMessages: [], // Loaded on demand for manager
    currentUserId,
    currentUserRole,
    onMarkRead: () => {
      // Mark read locally instantly in the conversation list
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, host_unread: 0 } : c))
      );
    },
  });

  // Fetch all conversations to refresh list (handles joins)
  const fetchConversations = useCallback(async () => {
    const hotelIds = hotels.map((h) => h.id);
    if (hotelIds.length === 0) return;

    const { data } = await supabase
      .from("conversations")
      .select(`
        *,
        hotels (
          id,
          name,
          location,
          image_url
        ),
        profiles: guest_id (
          id,
          full_name,
          phone
        )
      `)
      .in("hotel_id", hotelIds)
      .order("last_message_at", { ascending: false });

    if (data) {
      setConversations(data);
    }
  }, [hotels]);

  // Realtime subscription for conversation updates (badges, preview text, reordering)
  useEffect(() => {
    const channel = supabase
      .channel("manager-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        async (payload) => {
          const updatedRow = payload.new as Conversation;
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === updatedRow.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                ...updatedRow,
              };
              return next.sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() -
                  new Date(a.last_message_at).getTime()
              );
            } else {
              // New conversation started. Refetch list since payload lacks joins
              fetchConversations();
              return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  // Load guest email & booking details when active conversation guest / booking_id changes
  useEffect(() => {
    if (!activeConversation) {
      setTimeout(() => {
        setGuestEmail("");
        setBookingDetails(null);
      }, 0);
      return;
    }

    const conversation = activeConversation;

    // Load guest email
    async function fetchGuestEmail() {
      try {
        const res = await fetch(
          `/api/messages/guest-email?guestId=${conversation.guest_id}`
        );
        if (res.ok) {
          const data = await res.json();
          setGuestEmail(data.email || "No email provided");
        } else {
          setGuestEmail("No email provided");
        }
      } catch {
        setGuestEmail("No email provided");
      }
    }
    fetchGuestEmail();

    // Load booking if linked
    if (conversation.booking_id) {
      async function fetchBookingDetails() {
        setLoadingBooking(true);
        const { data } = await supabase
          .from("bookings")
          .select("*, rooms(name)")
          .eq("id", conversation.booking_id)
          .single();

        if (data) {
          setBookingDetails(data as unknown as Booking & { rooms: { name: string } | null });
        }
        setLoadingBooking(false);
      }
      fetchBookingDetails();
    } else {
      setTimeout(() => {
        setBookingDetails(null);
      }, 0);
    }
  }, [activeConversation]);

  // Resolve / Reopen Conversation
  const handleToggleResolve = () => {
    if (!activeConversation) return;
    const isResolved = activeConversation.status === "resolved";

    startTransition(async () => {
      await setResolved(activeConversation.id, !isResolved);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, status: isResolved ? "open" : "resolved" }
            : c
        )
      );
    });
  };

  // Quick Action Inserters (flow through the same optimistic send path)
  const sendQuickReply = async (replyText: string) => {
    if (!activeId) return;
    await sendMessage(replyText, []);
  };

  const handleSharePropertyInfo = () => {
    if (!activeConversation) return;
    const hotelName = activeConversation.hotels?.name || "our hotel";
    const location = activeConversation.hotels?.location || "our location";
    sendQuickReply(
      `Welcome to ${hotelName}! We are located at ${location}. Standard check-in is at 2:00 PM, and check-out is at 11:00 AM. Let us know if you need instructions to reach us.`
    );
  };

  const handleSharePolicies = () => {
    if (!activeConversation) return;
    sendQuickReply(
      "Hotel Rules & Policies:\n1. Smoking is strictly prohibited inside the rooms.\n2. Standard occupancy guidelines apply.\n3. Please keep noise levels to a minimum after 10:00 PM."
    );
  };

  // Filtered Conversations List
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Hotel filter
      if (selectedHotelId !== "all" && c.hotel_id !== selectedHotelId) {
        return false;
      }
      // Status tab filter
      if (filterTab === "unread" && c.host_unread === 0) {
        return false;
      }
      if (filterTab === "resolved" && c.status !== "resolved") {
        return false;
      }
      if (filterTab === "all" && c.status === "resolved") {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const guestName = c.profiles?.full_name?.toLowerCase() || "";
        const preview = c.last_message_preview?.toLowerCase() || "";
        return guestName.includes(query) || preview.includes(query);
      }

      return true;
    });
  }, [conversations, filterTab, selectedHotelId, searchQuery]);

  // Mask email helper for graceful fallback
  const maskEmail = (email: string) => {
    if (!email || email.includes("No email")) return "";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  };

  // Resolve display name
  const getDisplayName = (c: Conversation) => {
    if (c.profiles?.full_name) return c.profiles.full_name;
    return `Guest (${c.guest_id.slice(0, 4)})`;
  };

  // Guest initials for selected avatar
  const activeInitials = useMemo(() => {
    if (!activeConversation) return "G";
    const name = getDisplayName(activeConversation);
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [activeConversation]);

  // Format date helper for list rows
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
    <div className="mx-auto w-full h-[calc(100vh-3.5rem)] md:h-[calc(100vh-2rem)] max-w-7xl px-2 sm:px-4 py-4 md:py-6 flex gap-4 overflow-hidden">
      {/* 3-Column workspace layout */}

      {/* COLUMN 1: Conversation List (Hidden on mobile when thread is active) */}
      <div
        className={`w-full md:w-80 shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all duration-300 ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header filters */}
        <div className="p-4 border-b border-slate-150 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-slate-900 font-serif tracking-tight flex items-center gap-1.5">
              <MessageSquare className="h-5 w-5 text-brand-700" /> Inbox
            </h1>

            {/* Hotel filter */}
            {hotels.length > 1 && (
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="text-[10px] font-bold text-slate-650 border border-slate-200 rounded-lg px-2 py-1 outline-none bg-white focus:border-brand-500 cursor-pointer"
                >
                  <option value="all">All Hotels</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guests or messages..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-350 transition shadow-2xs"
            />
          </div>

          {/* Inbox tabs */}
          <div className="flex rounded-lg bg-slate-150/60 p-0.5">
            {[
              { id: "all", label: "Open" },
              { id: "unread", label: "Unread" },
              { id: "resolved", label: "Resolved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as "all" | "unread" | "resolved")}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-white text-brand-700 shadow-xs"
                    : "text-slate-550 hover:text-slate-850"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-[#FDFDFB]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-xs font-bold font-serif">No conversations found</p>
              <p className="text-[10px] text-slate-400 mt-1">There are no threads matching this filter.</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const displayName = getDisplayName(c);
              const initials = displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isActive = c.id === activeId;
              const hasUnread = c.host_unread > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setShowRightPanel(false);
                  }}
                  className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50/70 transition duration-200 outline-none border-l-4 ${
                    isActive
                      ? "bg-brand-50/40 border-brand-600 pl-3"
                      : "border-transparent"
                  }`}
                >
                  {/* Guest avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner uppercase">
                    {initials}
                  </div>

                  {/* Body preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span className={`block text-xs font-bold text-slate-900 truncate`}>
                        {displayName}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatLastMessageTime(c.last_message_at)}
                      </span>
                    </div>

                    <span className="block text-[9px] font-bold text-brand-650 tracking-wider uppercase mt-0.5">
                      {c.hotels?.name || "Hotel"}
                    </span>

                    <p
                      className={`text-xs mt-1 truncate ${
                        hasUnread ? "font-bold text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {c.last_message_preview || "No messages yet"}
                    </p>
                  </div>

                  {/* Badges */}
                  {hasUnread && (
                    <div className="self-center shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white leading-none shadow-sm">
                      {c.host_unread}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: Message Thread (Hidden on mobile when list is active) */}
      <div
        className={`flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs relative transition-all duration-300 ${
          activeId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Header info */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="md:hidden p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-700 flex items-center justify-center font-bold text-white text-xs shadow-md uppercase">
                  {activeInitials}
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    {getDisplayName(activeConversation)}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Action and Details buttons */}
              <div className="flex items-center gap-1">
                {activeConversation.status === "resolved" && (
                  <span className="rounded-full bg-slate-155 border border-slate-250 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-550">
                    Resolved
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`p-1.5 rounded-xl hover:bg-slate-200/65 text-slate-600 transition-colors cursor-pointer ${
                    showRightPanel ? "bg-slate-150" : ""
                  }`}
                  title="Guest Information"
                >
                  <Info className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Message window */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center bg-[#F8F7F4]">
                <Clock className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : (
              <ChatThread
                messages={messages}
                currentUserRole="host"
                otherPartyInitials={activeInitials}
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
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-[#F8F7F4]">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-md border border-slate-150 mb-4">
              <MessageSquare className="h-8 w-8 text-brand-600" />
            </div>
            <p className="text-base font-bold text-slate-700 font-serif">Select a conversation</p>
            <p className="text-xs text-slate-450 mt-1 max-w-sm">
              Choose a guest thread from the sidebar to view their profile, booking details, and begin chatting.
            </p>
          </div>
        )}
      </div>

      {/* COLUMN 3: Context Panel (Sidebar on desktop, drawer on mobile) */}
      {activeId && activeConversation && (
        <div
          className={`shrink-0 flex flex-col h-full gap-4 transition-all duration-300 overflow-y-auto ${
            showRightPanel
              ? "w-full md:w-80 flex absolute md:relative inset-0 md:inset-auto bg-[#F8F7F4] md:bg-transparent z-20 md:z-auto p-4 md:p-0"
              : "hidden"
          }`}
        >
          {/* Mobile Close Header */}
          <div className="md:hidden flex items-center justify-between mb-2">
            <h3 className="text-sm font-black uppercase text-slate-450 tracking-wider">
              Conversation Details
            </h3>
            <button
              type="button"
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to Chat
            </button>
          </div>

          {/* Guest Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-1.5">
              <User className="h-4 w-4 text-brand-600" /> Guest Profile
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shadow-inner uppercase">
                  {activeInitials}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {getDisplayName(activeConversation)}
                  </h4>
                  <p className="text-[10px] text-slate-450 font-bold tracking-wider uppercase mt-0.5">
                    ID: {activeConversation.guest_id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-650">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {activeConversation.profiles?.full_name ? guestEmail : maskEmail(guestEmail)}
                  </span>
                </div>
                {activeConversation.profiles?.phone && (
                  <div className="flex items-center gap-2.5 text-slate-650">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{activeConversation.profiles.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          {activeConversation.booking_id && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-600" /> Linked Booking
              </h3>
              
              {loadingBooking ? (
                <div className="flex justify-center py-4">
                  <Clock className="h-4 w-4 animate-spin text-brand-600" />
                </div>
              ) : bookingDetails ? (
                <div className="space-y-3.5 text-xs text-left">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirmation</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {bookingDetails.id.split("-")[0].toUpperCase()}
                      </p>
                    </div>
                    
                    <span className={`font-black uppercase tracking-wider text-[8px] px-2 py-0.5 rounded-full ${
                      bookingDetails.status === "confirmed" || bookingDetails.status === "checked_in"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}>
                      {bookingDetails.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Check-In</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {new Date(bookingDetails.check_in).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Check-Out</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {new Date(bookingDetails.check_out).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Room</span>
                      <span className="font-bold text-slate-800">
                        {bookingDetails.rooms?.name || "Standard Room"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Nights</span>
                      <span className="font-bold text-slate-800">{bookingDetails.nights} Night(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Guests</span>
                      <span className="font-bold text-slate-800">{bookingDetails.guest_count} Guest(s)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Failed to load booking summary.</p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-brand-600" /> Actions
            </h3>
            
            <div className="space-y-2 text-left">
              {/* Mark resolved */}
              <button
                type="button"
                onClick={handleToggleResolve}
                disabled={pending}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 disabled:opacity-50 cursor-pointer"
              >
                <span>{activeConversation.status === "resolved" ? "Re-open Conversation" : "Mark as Resolved"}</span>
                <CheckCircle className={`h-4.5 w-4.5 ${
                  activeConversation.status === "resolved" ? "text-slate-400" : "text-brand-600"
                }`} />
              </button>

              {activeConversation.status !== "resolved" && (
                <>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2 px-1">
                    Quick Replies
                  </div>
                  
                  {/* Share Info */}
                  <button
                    type="button"
                    onClick={handleSharePropertyInfo}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-slate-400" /> Property Info
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>

                  {/* Share Policies */}
                  <button
                    type="button"
                    onClick={handleSharePolicies}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-slate-400" /> Hotel Policies
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
