"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
  CreditCard,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Filter,
} from "lucide-react";
import { sendMessage, markRead, setResolved } from "@/app/messages/actions";
import ChatThread from "@/components/messaging/ChatThread";
import Composer from "@/components/messaging/Composer";
import type { Conversation, Message, Booking } from "@/lib/types";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pending, startTransition] = useTransition();

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
  }, []);

  // Fetch all conversations to refresh list (handles joins)
  const fetchConversations = async () => {
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
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const conversationId = activeId;

    async function loadMessages() {
      setLoadingMessages(true);
      // Mark read on server
      await markRead(conversationId);

      // Mark read locally instantly
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, host_unread: 0 } : c))
      );

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
      }
      setLoadingMessages(false);
    }

    loadMessages();
  }, [activeId]);

  // Load guest email & booking details when active conversation guest / booking_id changes
  useEffect(() => {
    if (!activeConversation) {
      setGuestEmail("");
      setBookingDetails(null);
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
      setBookingDetails(null);
    }
  }, [activeConversation?.guest_id, activeConversation?.booking_id]);

  // Handle Send Message
  const handleSend = async (body: string | null, attachments: any[]) => {
    if (!activeId) return;

    // Call server action
    await sendMessage(activeId, body, attachments);
  };

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

  // Quick Action Inserters
  const sendQuickReply = async (replyText: string) => {
    if (!activeId) return;
    await sendMessage(activeId, replyText, []);
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
        // resolved threads don't show in "all" by default to keep clean, or we can show them.
        // Let's hide resolved from All to mimic resolved inbox cleanup.
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

  // Guest initials for selected avatar
  const activeInitials = useMemo(() => {
    if (!activeConversation?.profiles?.full_name) return "G";
    return activeConversation.profiles.full_name
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
    <div className="mx-auto w-full h-[calc(100vh-3.5rem)] md:h-screen max-w-7xl px-4 py-6 sm:px-6 flex gap-4 overflow-hidden">
      {/* 3-Column workspace layout */}
      
      {/* COLUMN 1: Conversation List */}
      <div className="w-80 shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Header filters */}
        <div className="p-4 border-b border-slate-150 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-slate-900 font-serif tracking-tight flex items-center gap-1.5">
              <MessageSquare className="h-5 w-5 text-brand-600" /> Inbox
            </h1>
            
            {/* Hotel filter */}
            {hotels.length > 1 && (
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1 outline-none bg-slate-50 focus:border-brand-500 cursor-pointer"
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
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-350 focus:bg-white transition"
            />
          </div>

          {/* Inbox tabs */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {[
              { id: "all", label: "Open" },
              { id: "unread", label: "Unread" },
              { id: "resolved", label: "Resolved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-white text-brand-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-xs font-semibold">No conversations found.</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const initials = c.profiles?.full_name
                ? c.profiles.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "G";
              
              const isActive = c.id === activeId;
              const hasUnread = c.host_unread > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50/50 transition duration-200 outline-none ${
                    isActive ? "bg-brand-50/40 border-l-4 border-brand-600 pl-3.5" : ""
                  }`}
                >
                  {/* Guest avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner uppercase">
                    {initials}
                  </div>

                  {/* Body preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span className={`block text-xs font-bold text-slate-900 truncate`}>
                        {c.profiles?.full_name || "Guest User"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatLastMessageTime(c.last_message_at)}
                      </span>
                    </div>

                    <span className="block text-[10px] font-semibold text-brand-650 truncate mt-0.5">
                      {c.hotels?.name || "Hotel"}
                    </span>

                    <p className={`text-xs mt-1 truncate ${
                      hasUnread ? "font-bold text-slate-900" : "text-slate-500"
                    }`}>
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

      {/* COLUMN 2: Message Thread */}
      <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs relative">
        {activeConversation ? (
          <>
            {/* Header info */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center font-bold text-white text-xs shadow-inner uppercase">
                  {activeInitials}
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    {activeConversation.profiles?.full_name || "Guest User"}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      Online
                    </span>
                  </div>
                </div>
              </div>
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
                currentUserRole="host"
                otherPartyInitials={activeInitials}
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
            <p className="mt-3 text-sm font-bold text-slate-450">Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1">Choose a thread from the list to start messaging.</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: Context Panel */}
      {activeConversation && (
        <div className="w-80 shrink-0 flex flex-col h-full gap-4 overflow-y-auto">
          {/* Guest Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
              <User className="h-4 w-4 text-brand-600" /> Guest Information
            </h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner uppercase">
                  {activeInitials}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {activeConversation.profiles?.full_name || "Guest User"}
                  </h4>
                  <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Guest Profile</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                {guestEmail && (
                  <div className="flex items-center gap-2.5 text-slate-650">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{guestEmail}</span>
                  </div>
                )}
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
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-600" /> Booking Information
              </h3>
              {loadingBooking ? (
                <div className="flex justify-center py-4">
                  <Clock className="h-4 w-4 animate-spin text-brand-600" />
                </div>
              ) : bookingDetails ? (
                <div className="space-y-3.5 text-xs text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking ID</span>
                    <p className="font-bold text-slate-800 mt-0.5">{bookingDetails.id.split("-")[0].toUpperCase()}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-In</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {new Date(bookingDetails.check_in).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-Out</span>
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
                      <span className="text-slate-500 font-semibold">Room Type</span>
                      <span className="font-bold text-slate-800">{bookingDetails.rooms?.name || "Standard Room"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Guests</span>
                      <span className="font-bold text-slate-800">{bookingDetails.guest_count} Guest(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Status</span>
                      <span className={`font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full ${
                        bookingDetails.status === "confirmed"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {bookingDetails.status}
                      </span>
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
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
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
                  {/* Share Info */}
                  <button
                    type="button"
                    onClick={handleSharePropertyInfo}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 text-left cursor-pointer"
                  >
                    <span>Share Property Info</span>
                    <Building className="h-4.5 w-4.5 text-slate-400" />
                  </button>

                  {/* Share Policies */}
                  <button
                    type="button"
                    onClick={handleSharePolicies}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 text-left cursor-pointer"
                  >
                    <span>Share Policies</span>
                    <FileText className="h-4.5 w-4.5 text-slate-400" />
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
