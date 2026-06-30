"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { SWRConfig, preload } from "swr";
import { usePathname, useRouter } from "next/navigation";
import { fetcher, managerApiForRoute } from "@/lib/swr";
import {
  BuildingIcon,
  GridIcon,
  UsersIcon,
  WalletIcon,
  CreditCardIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  CheckIcon,
  GlobeIcon,
  XIcon,
  MessageSquareIcon,
} from "@/components/icons";
import type { UserRole } from "@/lib/types";

export interface ShellHotel {
  id: string;
  name: string;
  status: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
}

const MANAGER_NAV: NavItem[] = [
  { label: "Hotels", href: "/manager/hotels", icon: BuildingIcon, match: (p) => p.startsWith("/manager/hotels") },
  { label: "Manage", href: "/manager/manage", icon: GridIcon, match: (p) => p.startsWith("/manager/manage") },
  { label: "Staff", href: "/manager/staff", icon: UsersIcon, match: (p) => p.startsWith("/manager/staff") },
  { label: "Messages", href: "/manager/messages", icon: MessageSquareIcon, match: (p) => p.startsWith("/manager/messages") },
];

const MANAGER_NAV_SECONDARY: NavItem[] = [
  { label: "Earnings", href: "/manager/earnings", icon: WalletIcon, match: (p) => p.startsWith("/manager/earnings") },
  { label: "Payouts", href: "/manager/payouts", icon: CreditCardIcon, match: (p) => p.startsWith("/manager/payouts") },
];

const STAFF_NAV: NavItem[] = [
  { label: "Manage", href: "/manager/manage", icon: GridIcon, match: (p) => p.startsWith("/manager/manage") },
];

// Routes that keep the global marketing navbar and render full-bleed (no shell).
function isBareRoute(path: string) {
  return path.startsWith("/manager/create-hotel") || path.startsWith("/manager/waiting");
}

export function ManagerShell({
  role,
  hotels,
  userName,
  staffPermissions = [],
  children,
}: {
  role: UserRole;
  hotels: ShellHotel[];
  userName: string;
  staffPermissions?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Wizard / waiting render without the dashboard chrome.
  if (isBareRoute(pathname)) return <>{children}</>;

  const primary = role === "staff"
    ? (staffPermissions.includes("reply_messages")
        ? [
            ...STAFF_NAV,
            { label: "Messages", href: "/manager/messages", icon: MessageSquareIcon, match: (p: string) => p.startsWith("/manager/messages") }
          ]
        : STAFF_NAV)
    : MANAGER_NAV;
  const secondary = role === "staff" ? [] : MANAGER_NAV_SECONDARY;

  // Active hotel for the breadcrumb switcher (only on /manager/manage/[id]).
  const manageMatch = pathname.match(/^\/manager\/manage\/([^/]+)/);
  const activeHotelId = manageMatch?.[1] ?? null;
  const activeHotel = activeHotelId ? hotels.find((h) => h.id === activeHotelId) ?? null : null;

  const SidebarBody = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {primary.map((item) => (
        <SidebarLink key={item.href} item={item} active={item.match(pathname)} onNavigate={() => setMobileNavOpen(false)} />
      ))}
      {secondary.length > 0 && (
        <>
          <div className="my-2 border-t border-slate-200" />
          {secondary.map((item) => (
            <SidebarLink key={item.href} item={item} active={item.match(pathname)} onNavigate={() => setMobileNavOpen(false)} />
          ))}
        </>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — sticky full-height, scrolls independently */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/" className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 hover:bg-slate-50">
          <Image src="/logo-mark.png" alt="BookNest" width={28} height={28} className="h-7 w-7 object-contain" priority />
          <span className="font-serif text-lg font-bold text-slate-900">BookNest</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
            {role === "staff" ? "Staff" : "Manager"}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{SidebarBody}</div>
        <div className="space-y-1 border-t border-slate-200 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <GlobeIcon className="h-[18px] w-[18px]" /> View site
          </Link>
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-slate-700">{userName}</span>
          </div>
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileNavOpen(false)}
            />
            
            {/* Sidebar Slide-in */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl"
            >
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <Image src="/logo-mark.png" alt="BookNest" width={28} height={28} className="h-7 w-7 object-contain" />
                  <span className="font-serif text-lg font-bold text-slate-900">BookNest</span>
                </Link>
                <button onClick={() => setMobileNavOpen(false)} className="p-1 text-slate-500" aria-label="Close menu">
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{SidebarBody}</div>
              <div className="space-y-1 border-t border-slate-200 p-3">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  <GlobeIcon className="h-[18px] w-[18px]" /> View site
                </Link>
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-medium text-slate-700">{userName}</span>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: Vercel-style breadcrumb */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <GridIcon className="h-5 w-5" />
          </button>

          <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <Link href={role === "staff" ? "/manager/manage" : "/manager/hotels"} className="shrink-0 font-semibold text-slate-900">
              BookNest
            </Link>
            {activeHotelId && (
              <>
                <span className="text-slate-300">/</span>
                <HotelSwitcher hotels={hotels} active={activeHotel} activeId={activeHotelId} />
              </>
            )}
          </nav>
        </header>

        <div className="min-w-0 flex-1">
          <SWRConfig
            value={{
              fetcher,
              revalidateOnFocus: false,
              dedupingInterval: 10000,
              keepPreviousData: true,
            }}
          >
            {children}
          </SWRConfig>
        </div>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white md:hidden">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => warm(item.href)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function warm(href: string) {
  const key = managerApiForRoute(href);
  if (key) preload(key, fetcher);
}

function SidebarLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => warm(item.href)}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}

// Vercel-style hotel switcher pill in the breadcrumb.
function HotelSwitcher({
  hotels,
  active,
  activeId,
}: {
  hotels: ShellHotel[];
  active: ShellHotel | null;
  activeId: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Preserve the current sub-tab (the path segment after the hotel id) when switching.
  const tail = pathname.replace(new RegExp(`^/manager/manage/${activeId}`), "");

  const filtered = hotels.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-900 hover:bg-slate-100"
      >
        <span className="truncate">{active?.name ?? "Select hotel"}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <SearchIcon className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hotels…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">No hotels found</p>
              ) : (
                filtered.map((h) => (
                  <button
                    key={h.id}
                    onMouseEnter={() => preload(`/api/manager/manage/${h.id}`, fetcher)}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/manager/manage/${h.id}${tail}`);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      h.id === activeId ? "font-semibold text-brand-700" : "text-slate-700"
                    }`}
                  >
                    <span className="truncate">{h.name}</span>
                    {h.id === activeId && <CheckIcon className="h-4 w-4 shrink-0 text-brand-600" />}
                  </button>
                ))
              )}
            </div>
            <Link
              href="/manager/create-hotel"
              className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-slate-50"
            >
              <PlusIcon className="h-4 w-4" /> Add hotel
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
