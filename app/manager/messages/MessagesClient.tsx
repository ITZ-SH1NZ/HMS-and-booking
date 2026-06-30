"use client";

import { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
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
  MoreVertical,
  X,
  Sidebar,
  Columns,
  ChevronDown,
  Lock,
} from "lucide-react";
import { setResolved } from "@/app/messages/actions";
import { useConversationMessages } from "@/components/messaging/useConversationMessages";
import ChatThread from "@/components/messaging/ChatThread";
import Composer from "@/components/messaging/Composer";
import type { Conversation, Booking, Message } from "@/lib/types";

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
const EMPTY_MESSAGES: Message[] = [];

// Official WhatsApp SVG path from simple-icons
const WHATSAPP_SVG_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

export default function MessagesClient({
  initialConversations,
  hotels,
  currentUserId,
  currentUserRole,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Collapsible Sidebars (Desktop)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

  // Mobile Sheets / Modals
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState("");

  // Three dots header dropdown
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Filters & Search
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "resolved" | "unassigned" | "blocked" | "open">("open");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Details Panel State
  const [guestEmail, setGuestEmail] = useState("");
  const [bookingDetails, setBookingDetails] = useState<(Booking & { rooms: { name: string } | null }) | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Hook for messages
  const {
    messages,
    loading: loadingMessages,
    isOtherPartyTyping,
    sendMessage,
    sendTypingStatus,
  } = useConversationMessages({
    conversationId: activeId,
    initialMessages: EMPTY_MESSAGES,
    currentUserId,
    currentUserRole,
    onMarkRead: () => {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, host_unread: 0 } : c))
      );
    },
  });

  // Close moreDropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setShowMoreDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all conversations
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("manager-conversations-realtime-v3")
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

  // Load guest details & booking
  useEffect(() => {
    if (!activeConversation) {
      setTimeout(() => {
        setGuestEmail("");
        setBookingDetails(null);
      }, 0);
      return;
    }

    const conversation = activeConversation;

    async function fetchGuestEmail() {
      try {
        const res = await fetch(
          `/api/messages/guest-email?guestId=${conversation.guest_id}`
        );
        if (res.ok) {
          const data = await res.json();
          setGuestEmail(data.email || "No email");
        } else {
          setGuestEmail("No email");
        }
      } catch {
        setGuestEmail("No email");
      }
    }
    fetchGuestEmail();

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
    if (activeConversation) {
      document.body.classList.add("chat-active");
    } else {
      document.body.classList.remove("chat-active");
    }
    return () => {
      document.body.classList.remove("chat-active");
    };
  }, [activeConversation]);

  // Resolve / Reopen
  const handleToggleResolve = async () => {
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
      setShowResolveModal(false);
      setResolveNote("");
    });
  };

  // Quick Action Inserters
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

  // Dynamic filter counts
  const counts = useMemo(() => {
    const res = {
      all: conversations.length,
      open: conversations.filter((c) => c.status === "open").length,
      unread: conversations.filter((c) => c.host_unread > 0).length,
      resolved: conversations.filter((c) => c.status === "resolved").length,
      unassigned: conversations.filter((c) => !c.booking_id).length,
      blocked: conversations.filter((c) => (c.status as string) === "blocked").length,
    };
    return res;
  }, [conversations]);

  // Per-hotel counts
  const hotelCounts = useMemo(() => {
    const res: Record<string, number> = {};
    hotels.forEach((h) => {
      res[h.id] = conversations.filter((c) => c.hotel_id === h.id).length;
    });
    return res;
  }, [conversations, hotels]);

  // Filtered & Sorted Conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        if (selectedHotelId !== "all" && c.hotel_id !== selectedHotelId) {
          return false;
        }
        if (filterTab === "unread" && c.host_unread === 0) {
          return false;
        }
        if (filterTab === "resolved" && c.status !== "resolved") {
          return false;
        }
        if (filterTab === "open" && c.status !== "open") {
          return false;
        }
        if (filterTab === "unassigned" && c.booking_id) {
          return false;
        }
        if (filterTab === "blocked" && (c.status as string) !== "blocked") {
          return false;
        }

        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const guestName = c.profiles?.full_name?.toLowerCase() || "";
          const preview = c.last_message_preview?.toLowerCase() || "";
          return guestName.includes(query) || preview.includes(query);
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.last_message_at).getTime();
        const timeB = new Date(b.last_message_at).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [conversations, filterTab, selectedHotelId, searchQuery, sortOrder]);

  const getDisplayName = (c: Conversation) => {
    if (c.profiles?.full_name) return c.profiles.full_name;
    return `Guest (${c.guest_id.slice(0, 4)})`;
  };

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

  const cleanPhone = useMemo(() => {
    const phone = activeConversation?.profiles?.phone;
    return phone ? phone.replace(/[^0-9+]/g, "") : "";
  }, [activeConversation]);

  return (
    <div className="w-full h-[calc(100dvh-7.1rem)] md:h-[calc(100dvh-3.5rem)] chat-active-height flex overflow-hidden bg-[#F9F9FB] relative font-sans text-slate-800">
      
      {/* COLUMN 1: Filters Sidebar (Desktop) */}
      <div
        className={`hidden md:flex flex-col shrink-0 h-full border-r border-slate-200 bg-white transition-all duration-300 overflow-hidden ${
          isFiltersExpanded ? "w-64" : "w-0 border-r-0"
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <span className="text-sm font-bold tracking-wider uppercase text-slate-400">Conversations</span>
          <Filter className="h-4 w-4 text-slate-400" />
        </div>
        
        {/* Scrollable Filters */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar text-left">
          {/* Status Tabs */}
          <div className="space-y-1">
            {[
              { id: "all", label: "All Conversations", count: counts.all },
              { id: "unassigned", label: "Unassigned", count: counts.unassigned },
              { id: "open", label: "Open", count: counts.open },
              { id: "unread", label: "Unread", count: counts.unread },
              { id: "resolved", label: "Resolved", count: counts.resolved },
              { id: "blocked", label: "Blocked", count: counts.blocked },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as typeof filterTab)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-550 hover:bg-slate-550/10 hover:text-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  filterTab === tab.id ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500"
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filter by Hotel */}
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">Filter by Hotel</span>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedHotelId("all")}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                  selectedHotelId === "all"
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-550 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span>All Hotels</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{counts.all}</span>
              </button>
              {hotels.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHotelId(h.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                    selectedHotelId === h.id
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-550 hover:bg-slate-50 hover:text-slate-855"
                  }`}
                >
                  <span className="truncate pr-2">{h.name}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 shrink-0">
                    {hotelCounts[h.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-left">
          <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-750 transition shadow-2xs cursor-pointer">
            Manage Hotel Access
          </button>
        </div>
      </div>

      {/* COLUMN 2: Conversation List (Desktop) */}
      <div
        className={`w-full md:w-80 shrink-0 h-full border-r border-slate-200 bg-white flex flex-col transition-all duration-300 overflow-hidden ${
          activeId ? "hidden md:flex" : "flex"
        } ${isListExpanded ? "md:w-80" : "md:w-0 md:border-r-0"}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 space-y-3.5 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-serif capitalize">
              {filterTab} ({filteredConversations.length})
            </h2>
            
            <div className="flex items-center gap-1">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="text-[10px] font-bold text-slate-650 border border-slate-200 rounded-lg px-2 py-1 outline-none bg-white focus:border-brand-500 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-slate-200 bg-[#F9F9FB] pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300 focus:bg-white transition duration-200"
            />
          </div>
        </div>

        {/* Conversation Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-slate-50/20">
          {filteredConversations.length === 0 ? (
            <div className="p-10 text-center text-slate-455">
              <p className="text-xs font-bold font-serif">No conversations found</p>
              <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
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
              const isPriority = c.booking_id; // Priority if they have a booking

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full p-4 flex gap-3 text-left hover:bg-[#F9F6F0]/30 transition duration-200 outline-none border-l-3 relative ${
                    isActive
                      ? "bg-[#FDFBF7] border-brand-700 pl-3"
                      : "border-transparent"
                  }`}
                >
                  {/* Guest Avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#F3F1ED] border border-gold-200/30 flex items-center justify-center font-bold text-slate-700 text-xs shadow-3xs uppercase">
                    {initials}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span className="block text-xs font-black text-slate-900 truncate">
                        {displayName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                        {formatLastMessageTime(c.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="block text-[9px] font-bold text-slate-450 truncate uppercase tracking-widest">
                        {c.hotels?.name || "Hotel"}
                      </span>
                      {isPriority && (
                        <span className="bg-gold-50 text-gold-700 border border-gold-200/50 rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider shrink-0 scale-90">
                          Priority
                        </span>
                      )}
                    </div>

                    <p className={`text-xs mt-1.5 truncate ${
                      hasUnread ? "font-bold text-slate-900" : "text-slate-500"
                    }`}>
                      {c.last_message_preview || "No messages yet"}
                    </p>
                  </div>

                  {/* Badge */}
                  {hasUnread && (
                    <div className="self-center shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-700 text-[9px] font-black text-white leading-none shadow-xs">
                      {c.host_unread}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
          <button className="text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mx-auto py-1 cursor-pointer">
            Load more conversations <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* COLUMN 3: Chat View (Main Area) */}
      <div
        className={`flex-1 flex flex-col h-full bg-white transition-all duration-300 relative ${
          activeId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-white relative z-20">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-650 transition cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDetailsExpanded(true)}
                  className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer text-left focus:outline-none"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-700 to-brand-850 flex items-center justify-center font-bold text-white text-xs shadow-sm border border-brand-900 uppercase">
                    {activeInitials}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900 font-serif leading-none">
                        {getDisplayName(activeConversation)}
                      </h2>
                      {activeConversation.booking_id && (
                        <span className="bg-gold-50 text-gold-700 border border-gold-200/50 rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider">
                          Priority
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">
                        {activeConversation.hotels?.name}
                      </span>
                      {activeConversation.booking_id && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-450 font-bold">
                            Booking ID: {activeConversation.booking_id.split("-")[0].toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Action Buttons & Sidebar Toggles */}
              <div className="flex items-center gap-2 relative">
                
                {/* Custom Call / WhatsApp Links directly on header */}
                <div className="hidden sm:flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                  {activeConversation.profiles?.phone && (
                    <>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                        title="Call Guest"
                      >
                        <Phone className="h-4.5 w-4.5" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                        title="WhatsApp Chat"
                      >
                        {/* WhatsApp Custom SVG (Simple Icons Official Path) */}
                        <svg className="h-4.5 w-4.5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                          <path d={WHATSAPP_SVG_PATH} />
                        </svg>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMobileDetails(true)}
                    className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  >
                    <Info className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Column Toggle Buttons (Desktop) */}
                <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/45">
                  <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isFiltersExpanded ? "bg-white text-brand-700 shadow-3xs" : "text-slate-450 hover:text-slate-700"
                    }`}
                    title="Toggle Filters Sidebar"
                  >
                    <Sidebar className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isListExpanded ? "bg-white text-brand-700 shadow-3xs" : "text-slate-455 hover:text-slate-700"
                    }`}
                    title="Toggle Conversation List"
                  >
                    <Columns className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isDetailsExpanded ? "bg-white text-brand-700 shadow-3xs" : "text-slate-455 hover:text-slate-700"
                    }`}
                    title="Toggle Details Sidebar"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </div>

                {/* Menu button with Dropdown Menu */}
                <div ref={moreDropdownRef} className="relative">
                  <button
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                  >
                    <MoreVertical className="h-4.5 w-4.5" />
                  </button>
                  
                  {showMoreDropdown && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in text-left">
                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          setShowResolveModal(true);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4 text-slate-400" />
                        {activeConversation.status === "resolved" ? "Re-open Conversation" : "Mark as Resolved"}
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          alert("Conversation muted.");
                        }}
                        className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-slate-400" />
                        Mute Conversation
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          alert("Guest has been blocked.");
                        }}
                        className="w-full px-4 py-2.5 text-xs font-bold text-red-650 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Lock className="h-4 w-4 text-red-400" />
                        Block Guest
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message window */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-6 w-6 animate-spin text-brand-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retrieving History</span>
                </div>
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
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-[#F8F9FA]">
            <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-sm border border-gold-100/40 mb-5">
              <MessageSquare className="h-8 w-8 text-brand-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-serif tracking-tight">Concierge Desk</h3>
            <p className="text-xs text-slate-450 mt-1.5 max-w-xs leading-relaxed">
              Select a conversation to view details and message guests.
            </p>
          </div>
        )}
      </div>

      {/* COLUMN 4: Guest Details Sidebar (Desktop) */}
      <div
        className={`hidden md:flex flex-col shrink-0 h-full border-l border-slate-200 bg-[#F9F9FB] transition-all duration-300 overflow-y-auto p-4 space-y-4 text-left custom-scrollbar ${
          activeId && isDetailsExpanded ? "w-80" : "w-0 p-0 border-l-0"
        }`}
      >
        {activeConversation && (
          <>
            {/* Card 1: Guest Info */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-brand-700" /> Guest Details
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#F3F1ED] border border-gold-200/30 flex items-center justify-center font-bold text-slate-700 text-sm shadow-3xs uppercase">
                    {activeInitials}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {getDisplayName(activeConversation)}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      ID: {activeConversation.guest_id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Quick Action Links (Call, Email, WhatsApp) */}
                <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-3 my-2 text-center">
                  {activeConversation.profiles?.phone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <Phone className="h-4.5 w-4.5 text-slate-450" />
                      <span className="text-[9px] font-bold">Call</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <Phone className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-bold">Call</span>
                    </div>
                  )}

                  {guestEmail && !guestEmail.includes("No email") ? (
                    <a
                      href={`mailto:${guestEmail}`}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <Mail className="h-4.5 w-4.5 text-slate-455" />
                      <span className="text-[9px] font-bold">Email</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <Mail className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-bold">Email</span>
                    </div>
                  )}

                  {activeConversation.profiles?.phone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <svg className="h-4.5 w-4.5 text-[#25D366] fill-current" viewBox="0 0 24 24">
                        <path d={WHATSAPP_SVG_PATH} />
                      </svg>
                      <span className="text-[9px] font-bold">WhatsApp</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                        <path d={WHATSAPP_SVG_PATH} />
                      </svg>
                      <span className="text-[9px] font-bold">WhatsApp</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{guestEmail || "No email"}</span>
                  </div>
                  {activeConversation.profiles?.phone && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeConversation.profiles.phone}</span>
                    </div>
                  )}
                </div>

                <button className="w-full text-center text-xs font-black text-brand-700 hover:text-brand-850 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 cursor-pointer">
                  View full profile <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Booking Details */}
            {activeConversation.booking_id && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand-700" /> Booking Details
                  </span>
                </div>

                {loadingBooking ? (
                  <div className="flex justify-center py-4">
                    <Clock className="h-4 w-4 animate-spin text-brand-600" />
                  </div>
                ) : bookingDetails ? (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hotel</span>
                        <p className="font-bold text-slate-800 mt-0.5">{activeConversation.hotels?.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Check-in</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {new Date(bookingDetails.check_in).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Check-out</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {new Date(bookingDetails.check_out).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Nights</span>
                        <span className="font-bold text-slate-800">{bookingDetails.nights} Night</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Total Paid</span>
                        <span className="font-black text-slate-850 text-sm">
                          ₹{bookingDetails.total_price.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <button className="w-full text-center text-xs font-black text-brand-700 hover:text-brand-850 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 cursor-pointer">
                      View booking <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Failed to load booking.</p>
                )}
              </div>
            )}

            {/* Card 3: Quick Actions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-brand-700" /> Quick Actions
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSharePropertyInfo}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750 hover:bg-slate-50 hover:border-slate-300 transition duration-150 cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2"><Building className="h-4 w-4 text-slate-400" /> Send Property Info</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={handleSharePolicies}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750 hover:bg-slate-50 hover:border-slate-300 transition duration-150 cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> Share Hotel Guidelines</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowResolveModal(true)}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750 hover:bg-slate-50 hover:border-slate-300 transition duration-150 cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-slate-400" />
                    {activeConversation.status === "resolved" ? "Re-open Conversation" : "Mark as Resolved"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-xl border border-red-100 bg-red-50/25 hover:bg-red-50 p-3 text-xs font-bold text-red-600 transition cursor-pointer shadow-3xs"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-red-400" /> Block Guest
                  </span>
                  <ChevronRight className="h-4 w-4 text-red-300" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>


      {/* MOBILE SHEET: Filters & Sort */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-xs animate-fade-in" onClick={() => setShowMobileFilters(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-6 animate-slide-up text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black font-serif">Filter & Sort</h3>
              <button onClick={() => setShowMobileFilters(false)} className="p-1 rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">By Status</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "unassigned", label: "Unassigned" },
                    { id: "open", label: "Open" },
                    { id: "unread", label: "Unread" },
                    { id: "resolved", label: "Resolved" },
                    { id: "blocked", label: "Blocked" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterTab(tab.id as typeof filterTab)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                        filterTab === tab.id
                          ? "bg-brand-50 border-brand-300 text-brand-700"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">By Hotel</span>
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none bg-white"
                >
                  <option value="all">All Hotels</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowMobileFilters(false)}
              className="w-full py-3.5 bg-brand-700 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-brand-850 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SHEET: Guest & Booking Details */}
      {showMobileDetails && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-xs animate-fade-in" onClick={() => setShowMobileDetails(false)}>
          <div className="w-full max-w-md bg-[#F9F9FB] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="text-base font-black font-serif">Guest Details</h3>
              <button onClick={() => setShowMobileDetails(false)} className="p-1 rounded-full hover:bg-slate-150"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              {/* Guest Profile */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#F3F1ED] border border-gold-200/30 flex items-center justify-center font-bold text-slate-700 text-sm shadow-3xs uppercase">
                    {activeInitials}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {getDisplayName(activeConversation)}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      ID: {activeConversation.guest_id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Communication buttons */}
                <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-3 my-3 text-center">
                  {activeConversation.profiles?.phone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <Phone className="h-4.5 w-4.5 text-slate-450" />
                      <span className="text-[9px] font-bold">Call</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <Phone className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-bold">Call</span>
                    </div>
                  )}

                  {guestEmail && !guestEmail.includes("No email") ? (
                    <a
                      href={`mailto:${guestEmail}`}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <Mail className="h-4.5 w-4.5 text-slate-455" />
                      <span className="text-[9px] font-bold">Email</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <Mail className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-bold">Email</span>
                    </div>
                  )}

                  {activeConversation.profiles?.phone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 transition text-slate-650"
                    >
                      <svg className="h-4.5 w-4.5 text-[#25D366] fill-current" viewBox="0 0 24 24">
                        <path d={WHATSAPP_SVG_PATH} />
                      </svg>
                      <span className="text-[9px] font-bold">WhatsApp</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 opacity-40 text-slate-300">
                      <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                        <path d={WHATSAPP_SVG_PATH} />
                      </svg>
                      <span className="text-[9px] font-bold">WhatsApp</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-xs text-slate-650">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{guestEmail || "No email"}</span>
                  </div>
                  {activeConversation.profiles?.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeConversation.profiles.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Summary */}
              {activeConversation.booking_id && bookingDetails && (
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 space-y-4">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Calendar className="h-3.5 w-3.5 text-brand-700" /> Booking Details
                  </span>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hotel</span>
                      <span className="font-bold text-slate-800">{activeConversation.hotels?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-in</span>
                      <span className="font-bold text-slate-800">
                        {new Date(bookingDetails.check_in).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Check-out</span>
                      <span className="font-bold text-slate-800">
                        {new Date(bookingDetails.check_out).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Paid</span>
                      <span className="font-black text-slate-850">
                        ₹{bookingDetails.total_price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 space-y-2">
                <button
                  type="button"
                  onClick={handleSharePropertyInfo}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750"
                >
                  <span className="flex items-center gap-2"><Building className="h-4 w-4 text-slate-400" /> Send Property Info</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={handleSharePolicies}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750"
                >
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> Share Hotel Guidelines</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileDetails(false);
                    setShowResolveModal(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-750"
                >
                  <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-slate-400" /> Resolve Conversation</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE CONVERSATION MODAL (Desktop & Mobile) */}
      {showResolveModal && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in" onClick={() => setShowResolveModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-5 shadow-2xl animate-zoom-in text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black font-serif flex items-center gap-2 text-slate-900">
                <CheckCircle className="h-5 w-5 text-brand-700" /> Mark as Resolved
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="p-1 rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                This conversation with <strong className="text-slate-800">{getDisplayName(activeConversation)}</strong> will be archived. You can re-open it at any time if the guest replies.
              </p>
              
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Add a note (optional)</label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Guest issue resolved..."
                  className="w-full h-24 border border-slate-200 rounded-2xl p-3 text-xs outline-none focus:border-slate-300 bg-slate-50/50 focus:bg-white transition resize-none placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleResolve}
                disabled={pending}
                className="flex-1 py-3.5 bg-brand-700 hover:bg-brand-850 rounded-xl text-xs font-black uppercase tracking-wider text-white cursor-pointer shadow-xs"
              >
                {activeConversation.status === "resolved" ? "Re-open" : "Mark as Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
