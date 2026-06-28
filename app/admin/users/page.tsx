"use client";

import { useState, useTransition } from "react";
import useSWR, { mutate } from "swr";
import { motion } from "motion/react";
import { Panel } from "@/components/manager/Panel";
import { UsersIcon, SearchIcon, BanIcon } from "@/components/icons";
import { SkeletonTable } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { setUserRole, setUserSuspended } from "../actions";
import type { AdminUserRow } from "@/app/api/admin/users/route";
import type { UserRole } from "@/lib/types";

const ROLES: (UserRole | "all")[] = ["all", "guest", "manager", "staff", "admin"];
const ROLE_STYLE: Record<string, string> = {
  admin: "bg-slate-900 text-white",
  manager: "bg-blue-50 text-blue-700",
  staff: "bg-violet-50 text-violet-700",
  guest: "bg-slate-100 text-slate-600",
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const key = `/api/admin/users?q=${encodeURIComponent(q)}&role=${role}`;
  const { data, isLoading } = useSWR<{ rows: AdminUserRow[] }>(key);
  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Users</h1>
        <p className="text-sm text-slate-500">Search users, change roles, and suspend accounts.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.96 }}
              onClick={() => setRole(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer transition-colors ${
                role === r ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {r}
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 bg-white shadow-xs focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all">
          <SearchIcon className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" className="w-full bg-transparent text-sm outline-none sm:w-48 text-slate-800" />
        </div>
      </div>

      <div className="mt-5">
        {isLoading && !data ? (
          <SkeletonTable rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<UsersIcon className="h-6 w-6" />} title="No users found" description="Try a different search or filter." />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.03 } }
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
          >
            {rows.map((u) => (
              <motion.button
                key={u.id}
                variants={{
                  hidden: { opacity: 0, x: -4 },
                  show: { opacity: 1, x: 0 }
                }}
                whileHover={{ backgroundColor: "var(--color-slate-50)" }}
                transition={{ type: "tween", duration: 0.15 }}
                onClick={() => setSelected(u)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-0 cursor-pointer"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200/50">
                  {(u.full_name ?? "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{u.full_name ?? "Unnamed"}</p>
                  <p className="truncate text-xs text-slate-400">{u.phone || "No phone"}</p>
                </div>
                {u.suspended && (
                  <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    <BanIcon className="h-3 w-3" /> Suspended
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${ROLE_STYLE[u.role]}`}>
                  {u.role}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      <UserPanel user={selected} onClose={() => setSelected(null)} listKey={key} />
    </div>
  );
}

function UserPanel({ user, onClose, listKey }: { user: AdminUserRow | null; onClose: () => void; listKey: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!user) return null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        await mutate(listKey);
        onClose();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  return (
    <Panel open={!!user} onClose={onClose} title="User">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 ring-1 ring-slate-200/50">
            {(user.full_name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.full_name ?? "Unnamed"}</p>
            <p className="text-sm text-slate-500">{user.phone || "No phone"}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["guest", "staff", "manager", "admin"] as UserRole[]).map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.97 }}
                onClick={() => run(() => setUserRole(user.id, r))}
                disabled={pending || user.role === r}
                className={`rounded-lg border py-2 text-xs font-semibold capitalize cursor-pointer ${
                  user.role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                } disabled:opacity-60 transition-colors`}
              >
                {r}
              </motion.button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Click a role to change it immediately.</p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          {user.suspended ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => run(() => setUserSuspended(user.id, false))}
              disabled={pending}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Lift suspension
            </motion.button>
          ) : (
            <>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Suspension reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why are you suspending this account?"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => run(() => setUserSuspended(user.id, true, reason.trim() || undefined))}
                disabled={pending}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <BanIcon className="h-4 w-4" /> Suspend account
              </motion.button>
            </>
          )}
        </div>

        {error && <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</div>}
      </div>
    </Panel>
  );
}
