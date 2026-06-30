"use client";

import { useState, useTransition, useMemo } from "react";
import { mutate } from "swr";
import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/manager/Panel";
import { Price } from "@/components/Price";
import {
  Users,
  UserCheck,
  Mail,
  Trash2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Building,
  Info,
  Camera,
  Globe,
  Settings,
  MoreVertical,
  X,
  Keyboard,
  Shield,
} from "lucide-react";
import type { StaffPermission } from "@/lib/types";
import { inviteStaff, cancelInvite, revokeAssignment } from "./actions";
import type { StaffMember, InviteRow } from "./types";

const STAFF_KEY = "/api/manager/staff";

const PERM_LABEL: Record<string, string> = {
  view_occupancy: "View occupancy",
  manage_rooms: "Manage rooms",
  offline_booking: "Offline bookings",
  reply_messages: "Reply to messages",
};

const PERMISSIONS_CONFIG = [
  {
    key: "view_occupancy",
    label: "View occupancy",
    subPerms: [
      { key: "view_occupancy:current_guests", label: "Current guests", desc: "See in-house guests" },
      { key: "view_occupancy:arrivals", label: "Today's arrivals", desc: "View arriving guests" },
      { key: "view_occupancy:departures", label: "Today's departures", desc: "View departing guests" },
      { key: "view_occupancy:phone_numbers", label: "Guest phone numbers", desc: "View guest contact details" },
      { key: "view_occupancy:payment_details", label: "Guest payment details", desc: "View payment & billing info" },
    ],
  },
  {
    key: "manage_rooms",
    label: "Manage rooms",
    subPerms: [
      { key: "manage_rooms:edit", label: "Edit rooms", desc: "Edit room types & details" },
      { key: "manage_rooms:block_dates", label: "Block dates", desc: "Block/unblock room dates" },
      { key: "manage_rooms:pricing", label: "Season pricing", desc: "Manage seasonal pricing & rates" },
    ],
  },
  {
    key: "offline_booking",
    label: "Offline bookings",
    subPerms: [
      { key: "offline_booking:create", label: "Create walk-in", desc: "Create new walk-in / offline bookings" },
      { key: "offline_booking:edit", label: "Edit offline", desc: "Modify or cancel offline bookings" },
    ],
  },
  {
    key: "reply_messages",
    label: "Reply to messages",
    hint: "Read and answer guest messages",
    subPerms: [],
  },
];


function groupPermissions(perms: string[]) {
  const mainPerms = ["view_occupancy", "manage_rooms", "offline_booking", "reply_messages"] as const;
  const groups: Record<string, string[]> = {};
  
  perms.forEach((p) => {
    if (p.includes(":")) {
      const [main, sub] = p.split(":");
      if (!groups[main]) groups[main] = [];
      groups[main].push(sub);
    }
  });

  return mainPerms
    .filter((m) => perms.includes(m))
    .map((m) => {
      const subs = groups[m] || [];
      const config = PERMISSIONS_CONFIG.find((c) => c.key === m);
      const totalSubs = config?.subPerms?.length ?? 0;
      if (subs.length > 0 && subs.length < totalSubs) {
        return `${PERM_LABEL[m]} (${subs.length}/${totalSubs})`;
      }
      return PERM_LABEL[m];
    });
}


export function StaffClient({
  hotels,
  staff,
  invites,
}: {
  hotels: { id: string; name: string; location: string; image_url: string | null }[];
  staff: StaffMember[];
  invites: InviteRow[];
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const activeStaffCount = staff.length;
  const pendingInvitesCount = invites.length;
  const totalStaffCount = activeStaffCount + pendingInvitesCount;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950 font-serif tracking-tight">Staff</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Invite and manage team members to help operate specific hotels.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          disabled={hotels.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm hover:shadow"
        >
          <Users className="h-4 w-4" /> Invite staff
        </button>
      </div>

      {hotels.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
          <Building className="mx-auto h-10 w-10 text-slate-350" />
          <p className="mt-3 text-sm text-slate-500 font-semibold">
            Create a hotel first — then you can invite staff to manage it.
          </p>
        </div>
      )}

      {hotels.length > 0 && (
        <>
          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 mb-3">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-[22px] font-black text-slate-950">{totalStaffCount}</div>
              <div className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Total staff</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 mb-3">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="text-[22px] font-black text-slate-950">{activeStaffCount}</div>
              <div className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Active staff</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50/75 text-amber-600 mb-3">
                <Mail className="h-5 w-5" />
              </div>
              <div className="text-[22px] font-black text-slate-950">{pendingInvitesCount}</div>
              <div className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Pending invites</div>
            </div>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-xs font-black text-slate-400 uppercase tracking-wider">Pending invites</h2>
              <div className="space-y-3">
                {invites.map((inv) => (
                  <InviteCard key={inv.id} invite={inv} />
                ))}
              </div>
            </section>
          )}

          {/* Staff members */}
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-black text-slate-400 uppercase tracking-wider">Team members</h2>
            {staff.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500 font-semibold">No staff members yet.</p>
                <button
                  onClick={() => setInviteOpen(true)}
                  className="mt-2 text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Invite your first teammate
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {staff.map((m) => (
                  <StaffCard key={m.email} member={m} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Invite Drawer Panel */}
      <Panel
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite staff"
        widthClassName="md:w-[42rem] md:max-w-[90vw]"
      >
        <InviteForm hotels={hotels} onDone={() => setInviteOpen(false)} />
      </Panel>
    </div>
  );
}

function PermChips({ permissions }: { permissions: string[] }) {
  const chips = groupPermissions(permissions);
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.length === 0 ? (
        <span className="text-[10px] font-bold text-slate-400 uppercase">No permissions</span>
      ) : (
        chips.map((c) => (
          <span
            key={c}
            className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
          >
            {c}
          </span>
        ))
      )}
    </div>
  );
}

function InviteCard({ invite }: { invite: InviteRow }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/staff/accept?token=${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/15 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
            <Mail className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-bold text-slate-800">{invite.email}</span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">Invited</span>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-slate-500 flex items-center gap-1">
          <Building className="h-3.5 w-3.5 text-slate-400" /> {invite.hotelName}
        </p>
        <PermChips permissions={invite.permissions} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={copyLink}
          className="rounded-xl border border-slate-250 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={() =>
            startTransition(async () => {
              await cancelInvite(invite.id);
              await mutate(STAFF_KEY);
            })
          }
          disabled={pending}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50 transition"
          aria-label="Cancel invite"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StaffCard({ member }: { member: StaffMember }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-inner">
            {member.email.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="block text-sm font-bold text-slate-900 leading-tight">{member.email}</span>
            <span className="inline-block rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-green-700 mt-1">
              Active
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {member.assignments.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-150/60 text-left">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-800 flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-slate-400" /> {a.hotelName}
              </div>
              <PermChips permissions={a.permissions} />
            </div>
            <button
              onClick={() =>
                startTransition(async () => {
                  await revokeAssignment(a.id);
                  await mutate(STAFF_KEY);
                })
              }
              disabled={pending}
              className="shrink-0 rounded-lg p-1.5 text-slate-450 hover:bg-white hover:text-red-600 disabled:opacity-50 transition border border-transparent hover:border-slate-200 shadow-xs"
              aria-label="Remove from hotel"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Rebuilt Mockup-Accurate Invite Form ------------------------------------
function InviteForm({
  hotels,
  onDone,
}: {
  hotels: { id: string; name: string; location: string; image_url: string | null }[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePopover, setActivePopover] = useState<{ hotelId: string; permKey: string } | null>(null);

  // Initialize hotelAccess: all checked hotels get all permissions enabled by default.
  const [hotelAccess, setHotelAccess] = useState<
    Record<string, { enabled: boolean; permissions: string[] }>
  >(() => {
    const init: Record<string, { enabled: boolean; permissions: string[] }> = {};
    hotels.forEach((h) => {
      // Default: all sub-permissions are enabled.
      const allPerms: string[] = [];
      PERMISSIONS_CONFIG.forEach((c) => {
        allPerms.push(c.key);
        c.subPerms?.forEach((s) => allPerms.push(s.key));
      });
      init[h.id] = { enabled: false, permissions: allPerms };
    });
    return init;
  });

  // Filter hotels by search query
  const filteredHotels = useMemo(() => {
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [hotels, searchQuery]);

  // Handle checking/unchecking a hotel row
  function handleHotelToggle(hotelId: string) {
    setHotelAccess((prev) => ({
      ...prev,
      [hotelId]: {
        ...prev[hotelId],
        enabled: !prev[hotelId].enabled,
      },
    }));
  }

  // Handle select all matching
  const allMatchingEnabled = useMemo(() => {
    if (filteredHotels.length === 0) return false;
    return filteredHotels.every((h) => hotelAccess[h.id]?.enabled);
  }, [filteredHotels, hotelAccess]);

  function handleSelectAllToggle() {
    setHotelAccess((prev) => {
      const next = { ...prev };
      const targetState = !allMatchingEnabled;
      filteredHotels.forEach((h) => {
        next[h.id] = {
          ...next[h.id],
          enabled: targetState,
        };
      });
      return next;
    });
  }

  // Toggle a main permission (e.g. view_occupancy)
  function handleMainPermToggle(hotelId: string, permKey: string) {
    setHotelAccess((prev) => {
      const hotel = prev[hotelId];
      const config = PERMISSIONS_CONFIG.find((c) => c.key === permKey);
      if (!config) return prev;

      const subKeys = config.subPerms?.map((s) => s.key) ?? [];
      const isCurrentlyEnabled = hotel.permissions.includes(permKey);

      let nextPerms: string[];
      if (isCurrentlyEnabled) {
        // Turn off: remove main key and all its sub keys
        nextPerms = hotel.permissions.filter((p) => p !== permKey && !subKeys.includes(p));
      } else {
        // Turn on: add main key and all its sub keys (default all toggled)
        nextPerms = Array.from(new Set([...hotel.permissions, permKey, ...subKeys]));
      }

      return {
        ...prev,
        [hotelId]: { ...hotel, permissions: nextPerms },
      };
    });
  }

  // Toggle a single sub-permission
  function handleSubPermToggle(hotelId: string, permKey: string, subKey: string) {
    setHotelAccess((prev) => {
      const hotel = prev[hotelId];
      const isCurrentlyEnabled = hotel.permissions.includes(subKey);

      let nextPerms: string[];
      if (isCurrentlyEnabled) {
        nextPerms = hotel.permissions.filter((p) => p !== subKey);
      } else {
        nextPerms = [...hotel.permissions, subKey];
      }

      // If at least one sub-perm is active, make sure the main perm key is active
      const config = PERMISSIONS_CONFIG.find((c) => c.key === permKey);
      const subKeys = config?.subPerms.map((s) => s.key) ?? [];
      const hasAnySubActive = nextPerms.some((p) => subKeys.includes(p));

      if (hasAnySubActive && !nextPerms.includes(permKey)) {
        nextPerms.push(permKey);
      } else if (!hasAnySubActive && nextPerms.includes(permKey)) {
        nextPerms = nextPerms.filter((p) => p !== permKey);
      }

      return {
        ...prev,
        [hotelId]: { ...hotel, permissions: nextPerms },
      };
    });
  }

  // Compute summary stats
  const selectedHotelsCount = Object.values(hotelAccess).filter((h) => h.enabled).length;
  const totalGrantedPermissions = useMemo(() => {
    let total = 0;
    Object.entries(hotelAccess).forEach(([hId, val]) => {
      if (val.enabled) {
        // Count sub-permissions only (the ones with ':')
        total += val.permissions.filter((p) => p.includes(":")).length;
      }
    });
    return total;
  }, [hotelAccess]);

  function submit() {
    setError(null);
    const accessList = Object.entries(hotelAccess)
      .filter(([_, val]) => val.enabled)
      .map(([hotelId, val]) => ({
        hotelId,
        permissions: val.permissions,
      }));

    startTransition(async () => {
      const res = await inviteStaff(email, accessList);
      if (res.ok) {
        await mutate(STAFF_KEY);
        onDone();
      } else {
        setError(res.error ?? "Failed to send invite.");
      }
    });
  }

  return (
    <div className="space-y-6 text-left">
      {/* 3-Step Stepper (Visual) */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 pt-2">
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
          <span className="text-xs font-bold text-slate-900">Details</span>
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
          <span className="text-xs font-bold text-slate-900">Hotel access</span>
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">3</span>
          <span className="text-xs font-bold text-slate-500">Review & invite</span>
        </div>
      </div>

      {/* 1. Staff Details */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Staff details</h3>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email address *</span>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>
        </label>
      </div>

      {/* 2. Hotel Access */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Hotel access</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Choose the hotels this staff member can access and set their permissions.
        </p>

        {/* Search & Filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hotels..."
              className="w-full rounded-xl border border-slate-250 bg-white pl-9 pr-4 py-2.5 text-xs outline-none focus:border-brand-500"
            />
          </div>
          <select className="rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-brand-500">
            <option>All hotels</option>
          </select>
        </div>

        {/* Select All Matching */}
        {filteredHotels.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allMatchingEnabled}
              onChange={handleSelectAllToggle}
              className="rounded border-slate-300 text-brand-650 focus:ring-brand-500 accent-brand-600"
            />
            <span>Select all matching ({filteredHotels.length} hotels)</span>
          </label>
        )}

        {/* Scrollable Grid Container */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <div className="min-w-[480px]">
            {/* Permissions Grid Header */}
            <div className="grid grid-cols-[1fr_85px_85px_85px_85px] gap-2 items-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-450 border-b border-slate-150/70 bg-slate-50/60">
              <div>Hotel</div>
              <div className="text-center flex items-center justify-center gap-0.5">
                View occ <Info className="h-3 w-3 text-slate-400" />
              </div>
              <div className="text-center flex items-center justify-center gap-0.5">
                Rooms <Info className="h-3 w-3 text-slate-400" />
              </div>
              <div className="text-center flex items-center justify-center gap-0.5">
                Offline <Info className="h-3 w-3 text-slate-400" />
              </div>
              <div className="text-center flex items-center justify-center gap-0.5" title="Read and answer guest messages">
                Messages <Info className="h-3 w-3 text-slate-400" />
              </div>
            </div>

            {/* Hotels list */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {filteredHotels.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400 font-semibold">No hotels match your search.</p>
              ) : (
                filteredHotels.map((h) => {
                  const access = hotelAccess[h.id];
                  const isChecked = access?.enabled;

                  return (
                    <div
                      key={h.id}
                      className={`grid grid-cols-[1fr_85px_85px_85px_85px] gap-2 items-center px-4 py-3.5 hover:bg-slate-50/40 transition ${
                        isChecked ? "bg-slate-50/20" : ""
                      }`}
                    >
                      {/* Hotel info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleHotelToggle(h.id)}
                          className="rounded border-slate-300 text-brand-650 focus:ring-brand-500 accent-brand-600 shrink-0"
                        />
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                          {h.image_url ? (
                            <Image src={h.image_url} alt={h.name} fill className="object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-300">
                              <Building className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="block text-xs font-bold text-slate-900 truncate">{h.name}</span>
                          <span className="block text-[10px] font-semibold text-slate-450 truncate mt-0.5">
                            {h.location}
                          </span>
                        </div>
                      </div>

                      {/* Three Permission toggles with dropdowns */}
                      {PERMISSIONS_CONFIG.map((col) => {
                        const isPermOn = isChecked && access.permissions.includes(col.key);
                        const activeSubCount = isChecked
                          ? access.permissions.filter((p) => p.startsWith(`${col.key}:`)).length
                          : 0;

                        const isOpen = activePopover?.hotelId === h.id && activePopover?.permKey === col.key;

                        return (
                          <div key={col.key} className="flex items-center justify-center gap-1 relative">
                            {/* Toggle Switch */}
                            <button
                              type="button"
                              disabled={!isChecked}
                              onClick={() => handleMainPermToggle(h.id, col.key)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                isPermOn ? "bg-green-600" : "bg-slate-200"
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isPermOn ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>

                            {/* Chevron Trigger */}
                            {col.subPerms && col.subPerms.length > 0 ? (
                              <button
                                type="button"
                                disabled={!isChecked}
                                onClick={() => {
                                  if (isOpen) {
                                    setActivePopover(null);
                                  } else {
                                    setActivePopover({ hotelId: h.id, permKey: col.key });
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-25"
                              >
                                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180 text-slate-700" : ""}`} />
                              </button>
                            ) : (
                              <div className="w-5" />
                            )}

                            {/* Floating Sub-permissions Popover */}
                            {isOpen && col.subPerms && col.subPerms.length > 0 && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)} />
                                <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-left border-t border-slate-150">
                                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                                    <Settings className="h-3.5 w-3.5 text-brand-600" /> {col.label} settings
                                  </h4>
                                  <div className="space-y-3">
                                    {col.subPerms.map((sub) => {
                                      const isSubOn = access.permissions.includes(sub.key);
                                      return (
                                        <label
                                          key={sub.key}
                                          className="flex items-start gap-2.5 cursor-pointer select-none group"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSubOn}
                                            onChange={() => handleSubPermToggle(h.id, col.key, sub.key)}
                                            className="mt-0.5 rounded border-slate-300 text-brand-650 focus:ring-brand-500 accent-brand-600 shrink-0"
                                          />
                                          <div className="text-xs">
                                            <span className="block font-bold text-slate-800 group-hover:text-brand-700 transition">
                                              {sub.label}
                                            </span>
                                            <span className="block text-[10px] text-slate-455 mt-0.5 leading-normal">
                                              {sub.desc}
                                            </span>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div className="border-t border-slate-100 mt-4 pt-2.5 flex justify-between text-[10px] font-bold text-slate-450">
                                    <span>Selected</span>
                                    <span className="text-brand-700">{activeSubCount} of {col.subPerms.length}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Summary & Actions */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Shield className="h-3.5 w-3.5 text-brand-600" /> Summary
        </h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Staff Email</span>
            <p className="font-bold text-slate-800 mt-0.5 truncate">{email || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Hotels Selected</span>
            <p className="font-bold text-slate-800 mt-0.5">{selectedHotelsCount} of {hotels.length}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Permissions</span>
            <p className="font-bold text-slate-800 mt-0.5">{totalGrantedPermissions} granted</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-semibold">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !email || selectedHotelsCount === 0}
          className="flex-grow rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {pending ? "Sending..." : "Send invite"}
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-400 font-medium leading-relaxed px-4">
        We'll create an invite link you can copy and share. The recipient accepts by signing in with this email.
      </p>
    </div>
  );
}
