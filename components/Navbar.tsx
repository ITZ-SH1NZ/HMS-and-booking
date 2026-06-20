"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/lib/auth";
import { SearchForm } from "@/components/SearchForm";
import { BedIcon } from "@/components/icons";

const NAV_LINKS = [
  { label: "Explore", href: "/hotels" },
  { label: "Destinations", href: "/#categories" },
  { label: "Deals", href: "/#hotels" },
  { label: "Hosts", href: "/signup/manager" },
  { label: "About Us", href: "/#why" },
];

export function Navbar() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const role = profile?.role;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-600 text-white">
            <BedIcon className="h-5 w-5" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-rose-600">
            HMS
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 justify-center md:flex">
          <Suspense fallback={<div className="h-10 w-72" />}>
            <SearchForm compact />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
          ) : !user ? (
            <>
              <Link
                href="/signup/manager"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:block"
              >
                Become a Host
              </Link>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium hover:shadow-sm"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white">
                  {(profile?.full_name ?? user.email ?? "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate sm:block">
                  {profile?.full_name ?? user.email}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {role === "guest" && (
                    <>
                      <MenuLink href="/dashboard" onClick={() => setMenuOpen(false)}>
                        View Bookings
                      </MenuLink>
                      <MenuLink
                        href="/dashboard?tab=profile"
                        onClick={() => setMenuOpen(false)}
                      >
                        Edit Profile
                      </MenuLink>
                    </>
                  )}
                  {role === "manager" && (
                    <>
                      <MenuLink
                        href="/manager/dashboard"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard
                      </MenuLink>
                      <MenuLink
                        href="/manager/create-hotel"
                        onClick={() => setMenuOpen(false)}
                      >
                        Create New Hotel
                      </MenuLink>
                    </>
                  )}
                  {role === "admin" && (
                    <MenuLink
                      href="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Panel
                    </MenuLink>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
