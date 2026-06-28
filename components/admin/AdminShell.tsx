"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SWRConfig, preload } from "swr";
import { usePathname } from "next/navigation";
import { GridIcon, ShieldIcon, BuildingIcon, UsersIcon, GlobeIcon, XIcon } from "@/components/icons";
import { fetcher, adminApiForRoute } from "@/lib/swr";

function warm(href: string) {
  const key = adminApiForRoute(href);
  if (key) preload(key, fetcher);
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard", icon: GridIcon },
  { label: "Verifications", href: "/admin/verifications", icon: ShieldIcon },
  { label: "Listings", href: "/admin/listings", icon: BuildingIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
];

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin/dashboard" ? pathname === href || pathname === "/admin" : pathname.startsWith(href);

  const Body = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            onMouseEnter={() => warm(item.href)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/" className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 hover:bg-slate-50">
          <Image src="/logo-mark.png" alt="BookNest" width={28} height={28} className="h-7 w-7 object-contain" priority />
          <span className="font-serif text-lg font-bold text-slate-900">BookNest</span>
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{Body}</div>
        <div className="space-y-1 border-t border-slate-200 p-3">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            <GlobeIcon className="h-[18px] w-[18px]" /> View site
          </Link>
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-slate-700">{userName}</span>
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <span className="font-serif text-lg font-bold text-slate-900">BookNest Admin</span>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-slate-500" aria-label="Close menu">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {Body}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4">
          <button onClick={() => setMobileNavOpen(true)} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open menu">
            <GridIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">{NAV.find((n) => isActive(n.href))?.label ?? "Admin"}</span>
        </header>

        <div className="min-w-0 flex-1">
          <SWRConfig value={{ fetcher, revalidateOnFocus: false, dedupingInterval: 8000, keepPreviousData: true }}>
            {children}
          </SWRConfig>
        </div>
      </div>
    </div>
  );
}
