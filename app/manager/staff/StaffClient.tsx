"use client";

import { useState, useTransition } from "react";
import { mutate } from "swr";
import { Panel } from "@/components/manager/Panel";
import { PlusIcon, UsersIcon, TrashIcon, MailIcon, CheckIcon } from "@/components/icons";
import type { StaffPermission } from "@/lib/types";
import { inviteStaff, cancelInvite, revokeAssignment } from "./actions";
import type { StaffMember, InviteRow } from "./types";

const STAFF_KEY = "/api/manager/staff";

const PERMISSIONS: { key: StaffPermission; label: string; hint: string }[] = [
  { key: "offline_booking", label: "Offline bookings", hint: "Create walk-in / phone bookings" },
  { key: "view_occupancy", label: "View occupancy", hint: "See arrivals, departures, who's in" },
  { key: "manage_rooms", label: "Manage rooms", hint: "Edit rooms, block dates, prices" },
];
const PERM_LABEL: Record<StaffPermission, string> = {
  offline_booking: "Offline bookings",
  view_occupancy: "View occupancy",
  manage_rooms: "Manage rooms",
};

export function StaffClient({
  hotels,
  staff,
  invites,
}: {
  hotels: { id: string; name: string }[];
  staff: StaffMember[];
  invites: InviteRow[];
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500">Invite people to help manage specific hotels.</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          disabled={hotels.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" /> Invite staff
        </button>
      </div>

      {hotels.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Create a hotel first — then you can invite staff to manage it.
        </p>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-bold text-slate-700">Pending invites</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <InviteCard key={inv.id} invite={inv} />
            ))}
          </div>
        </section>
      )}

      {/* Staff members */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-slate-700">Team</h2>
        {staff.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <UsersIcon className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No staff yet. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((m) => (
              <StaffCard key={m.email} member={m} />
            ))}
          </div>
        )}
      </section>

      <Panel open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite staff">
        <InviteForm hotels={hotels} onDone={() => setInviteOpen(false)} />
      </Panel>
    </div>
  );
}

function PermChips({ permissions }: { permissions: StaffPermission[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.length === 0 ? (
        <span className="text-xs text-slate-400">No permissions</span>
      ) : (
        permissions.map((p) => (
          <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {PERM_LABEL[p]}
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
    <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <MailIcon className="h-4 w-4 text-amber-600" />
          <span className="truncate text-sm font-medium text-slate-900">{invite.email}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Invited</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{invite.hotelName}</p>
        <div className="mt-1"><PermChips permissions={invite.permissions} /></div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={copyLink} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          onClick={() => startTransition(async () => { await cancelInvite(invite.id); await mutate(STAFF_KEY); })}
          disabled={pending}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600 disabled:opacity-50"
          aria-label="Cancel invite"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StaffCard({ member }: { member: StaffMember }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {member.email.slice(0, 1).toUpperCase()}
        </div>
        <span className="truncate text-sm font-semibold text-slate-900">{member.email}</span>
      </div>
      <div className="mt-3 space-y-2">
        {member.assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">{a.hotelName}</div>
              <div className="mt-0.5"><PermChips permissions={a.permissions} /></div>
            </div>
            <button
              onClick={() => startTransition(async () => { await revokeAssignment(a.id); await mutate(STAFF_KEY); })}
              disabled={pending}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600 disabled:opacity-50"
              aria-label="Remove from hotel"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteForm({ hotels, onDone }: { hotels: { id: string; name: string }[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [perms, setPerms] = useState<StaffPermission[]>(["view_occupancy"]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inviteStaff(email, selectedHotels, perms);
      if (res.ok) {
        await mutate(STAFF_KEY);
        onDone();
      } else {
        setError(res.error ?? "Failed to send invite.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Email *</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Hotels *</span>
        <div className="space-y-1.5">
          {hotels.map((h) => {
            const on = selectedHotels.includes(h.id);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHotels((l) => toggle(l, h.id))}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                  on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {h.name}
                {on && <CheckIcon className="h-4 w-4 text-brand-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Permissions *</span>
        <div className="space-y-1.5">
          {PERMISSIONS.map((p) => {
            const on = perms.includes(p.key);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPerms((l) => toggle(l, p.key))}
                className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left ${
                  on ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-800">{p.label}</span>
                  <span className="block text-xs text-slate-500">{p.hint}</span>
                </span>
                {on && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
      <p className="text-center text-xs text-slate-400">
        We&apos;ll create an invite link you can copy and share. They accept by signing in with this email.
      </p>
    </div>
  );
}
