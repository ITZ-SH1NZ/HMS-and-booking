"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { UsersIcon, BuildingIcon, StarIcon, ShieldIcon, ArrowRightIcon, ClockIcon } from "@/components/icons";
import { Skeleton, SkeletonStats } from "@/components/Skeleton";
import type { AdminAuditEntry } from "@/lib/types";

interface OverviewData {
  stats: { users: number; hotels: number; reviews: number; managers: number };
  pending: { verifications: number; hotels: number };
  audit: AdminAuditEntry[];
}

const STAT_META = [
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "hotels", label: "Hotels", icon: BuildingIcon },
  { key: "reviews", label: "Reviews", icon: StarIcon },
  { key: "managers", label: "Managers", icon: ShieldIcon },
] as const;

const MotionLink = motion(Link);

function describe(a: AdminAuditEntry): string {
  const d = a.details ?? {};
  const name = (d.name as string) || (d.business as string) || (d.role as string) || "";
  const map: Record<string, string> = {
    manager_approved: "Approved manager",
    manager_rejected: "Rejected manager",
    manager_more_info: "Requested more info from manager",
    hotel_approved: "Approved hotel",
    hotel_rejected: "Rejected hotel",
    set_role: "Changed user role",
    suspend_user: "Suspended user",
    unsuspend_user: "Unsuspended user",
  };
  return `${map[a.action] ?? a.action}${name ? ` · ${name}` : ""}`;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();
    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * end);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useSWR<OverviewData>("/api/admin/overview");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">Overview</h1>
        <p className="text-sm text-slate-500">Platform health, pending reviews and recent activity.</p>
      </div>

      {/* Pending queue */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } }
        }}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <QueueCard
          href="/admin/verifications"
          label="Manager verifications"
          count={data?.pending.verifications}
          loading={isLoading && !data}
          icon={<ShieldIcon className="h-5 w-5" />}
        />
        <QueueCard
          href="/admin/listings"
          label="Hotels awaiting approval"
          count={data?.pending.hotels}
          loading={isLoading && !data}
          icon={<BuildingIcon className="h-5 w-5" />}
        />
      </motion.div>

      {/* Stats */}
      <div className="mt-6">
        {isLoading && !data ? (
          <SkeletonStats count={4} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } }
            }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {STAT_META.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.key}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -2 }}
                  transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{s.label}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    <AnimatedNumber value={data?.stats[s.key] ?? 0} />
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Recent activity */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-slate-700">Recent activity</h2>
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (data?.audit.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No admin activity yet.
          </p>
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
            {data!.audit.map((a) => (
              <motion.div
                key={a.id}
                variants={{
                  hidden: { opacity: 0, x: -4 },
                  show: { opacity: 1, x: 0 }
                }}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50/55 transition-colors text-slate-700"
              >
                <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="flex-1 text-sm">{describe(a)}</span>
                <span className="text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

function QueueCard({
  href,
  label,
  count,
  loading,
  icon,
}: {
  href: string;
  label: string;
  count?: number;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -3 }}
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-4 w-16" />
          ) : (
            <p className="text-xs text-slate-500">
              <span className={count ? "font-bold text-brand-700" : "font-medium text-slate-700"}>
                {count ?? 0}
              </span>{" "}
              pending
            </p>
          )}
        </div>
      </div>
      <ArrowRightIcon className="h-5 w-5 text-slate-400" />
    </MotionLink>
  );
}

