"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/lib/auth";
import { GlobeIcon, HeartIcon } from "@animateicons/react/lucide";
import { createPublicClient } from "@/lib/supabase/public";
import { AirbnbSearch } from "@/components/AirbnbSearch";
import { getOptimizedImageUrl } from "@/lib/image";
import { useCurrency } from "@/components/CurrencyProvider";

const NAV_LINKS = [
  { label: "Stays", href: "/" },
  { label: "Explore", href: "/hotels" },
  { label: "Offers", href: "/#offers" },
  { label: "Business Travel", href: "/#hotels" },
  { label: "Gift Cards", href: "#" },
];

export function Navbar() {
  const { user, profile, loading } = useAuth();
  const { currency, locale, setCurrencyAndLocale } = useCurrency();
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<"stays" | "experiences" | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [dynamicData, setDynamicData] = useState<{
    cities: { name: string; count: number }[];
    propertyTypes: { name: string; count: number }[];
    featuredHotel: { id: string; name: string; city: string; image_url: string } | null;
  }>({ cities: [], propertyTypes: [], featuredHotel: null });

  // Scroll event listener for compact search pill
  useEffect(() => {
    if (pathname !== "/") return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const showSearchPill = pathname !== "/" || isScrolled;

  // Load dynamic data from Supabase for mega-menus
  useEffect(() => {
    async function loadNavbarData() {
      try {
        const supabase = createPublicClient();
        const { data: hotels } = await supabase
          .from("hotels")
          .select("id, name, city, property_type, image_url")
          .eq("status", "approved");

        if (hotels) {
          const cityMap: Record<string, number> = {};
          const typeMap: Record<string, number> = {};
          hotels.forEach((h) => {
            if (h.city) {
              const city = h.city.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());
              cityMap[city] = (cityMap[city] || 0) + 1;
            }
            if (h.property_type) {
              const type = h.property_type.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());
              typeMap[type] = (typeMap[type] || 0) + 1;
            }
          });

          const cities = Object.entries(cityMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

          const propertyTypes = Object.entries(typeMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

          const featuredHotel = hotels.length > 0 ? hotels[0] : null;

          setDynamicData({ cities, propertyTypes, featuredHotel });
        }
      } catch (e) {
        console.error("Failed to load dynamic navbar data:", e);
      }
    }
    loadNavbarData();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleMouseEnter = (menu: "stays" | "experiences") => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMega(menu);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveMega(null);
  };

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const role = profile?.role;

  return (
    <header 
      className="sticky top-0 z-40 w-full px-4 pt-4 bg-transparent pointer-events-none transition-all duration-300"
      onMouseLeave={handleMouseLeave}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 rounded-full border border-slate-250 bg-white/90 backdrop-blur-md shadow-xs pointer-events-auto transition-all duration-300 ${
        isScrolled ? "shadow-md bg-white/95 py-2.5" : "py-4"
      }`}>
        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 select-none">
          <Image
            src="/logo-mark.png"
            alt="BookNest Logo"
            width={48}
            height={48}
            className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105 active:rotate-3"
            priority
          />
          <div className="flex flex-col justify-center">
            <span className="text-2xl font-black tracking-tight text-brand-750 leading-none">
              BookNest
            </span>
            <span className="text-[9px] font-black tracking-widest text-gold-600 uppercase mt-1.5 whitespace-nowrap hidden sm:inline-block">
              Stays that feel like home
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation — Morph between links and Search Pill */}
        <div className="hidden lg:flex flex-1 justify-center items-center relative h-10 min-w-[340px]">
          {/* Nav Links */}
          <nav
            className={`absolute transition-all duration-300 flex items-center gap-6 ${
              showSearchPill
                ? "opacity-0 pointer-events-none scale-95 translate-y-2"
                : "opacity-100 pointer-events-auto scale-100 translate-y-0"
            }`}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onMouseEnter={() => {
                  if (link.label === "Stays") handleMouseEnter("stays");
                  else handleMouseLeave();
                }}
                className="text-sm font-bold text-slate-650 hover:text-brand-600 transition-colors duration-200 relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md px-1"
              >
                {link.label}
                {link.label === "Stays" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Search Pill */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className={`absolute transition-all duration-300 flex items-center gap-2 border border-slate-250 hover:border-slate-350 shadow-xs hover:shadow-sm bg-white rounded-full py-1.5 pl-4 pr-2.5 font-sans cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              showSearchPill
                ? "opacity-100 pointer-events-auto scale-100 translate-y-0"
                : "opacity-0 pointer-events-none scale-95 -translate-y-2"
            }`}
          >
            <span className="text-xs font-black text-slate-800 tracking-tight">Anywhere</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="text-xs font-black text-slate-800 tracking-tight">Any week</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-500 tracking-tight">Add guests</span>
            <span className="ml-2 grid h-6.5 w-6.5 place-items-center rounded-full bg-brand-600 text-white shadow-xs">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
          {/* Become a Host (Desktop only) */}
          {!user && (
            <Link
              href="/signup/manager"
              className="hidden lg:block rounded-full px-3.5 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Become a Host
            </Link>
          )}

          {/* Globe/Language Selector (Desktop only) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              aria-label="Language and currency selection"
              className="hidden lg:flex p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 items-center justify-center cursor-pointer"
            >
              <GlobeIcon size={18} />
              <span className="text-[9px] font-black ml-1.5 text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded-full select-none">
                {currency}
              </span>
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 grid grid-cols-1 gap-4 text-left animate-pop-in">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Currency</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { code: "INR", symbol: "INR (₹)" },
                        { code: "USD", symbol: "USD ($)" },
                        { code: "EUR", symbol: "EUR (€)" },
                        { code: "GBP", symbol: "GBP (£)" },
                      ].map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => {
                            setCurrencyAndLocale(curr.code, locale);
                            setPickerOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        >
                          <span>{curr.symbol}</span>
                          {currency === curr.code && (
                            <svg className="h-3.5 w-3.5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
 
          {/* Wishlist Icon (Desktop only) */}
          <Link
            href="/dashboard/bookings"
            aria-label="Wishlist"
            className="hidden lg:flex p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 items-center justify-center"
          >
            <HeartIcon size={18} />
          </Link>

          {/* Desktop/Tablet Auth or User capsule dropdown */}
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
          ) : (
            <>
              {/* Desktop-only view (lg and up) */}
              <div className="hidden lg:flex items-center gap-3">
                {!user ? (
                  <>
                    <Link
                      href="/login"
                      className="rounded-full px-3.5 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 transition"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="flex items-center gap-3 rounded-full border border-slate-200 bg-white p-1.5 pl-3 pr-1.5 hover:shadow-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                    >
                      <svg className="h-4.5 w-4.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-xs font-black text-white shadow-inner shrink-0 select-none">
                        {(profile?.full_name ?? user.email ?? "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-pop-in">
                        {role === "guest" && (
                          <>
                            <MenuLink
                              href="/dashboard/bookings"
                              onClick={() => setMenuOpen(false)}
                            >
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
                            <MenuLink
                              href="/manager/earnings"
                              onClick={() => setMenuOpen(false)}
                            >
                              Earnings
                            </MenuLink>
                            <MenuLink
                              href="/manager/payouts"
                              onClick={() => setMenuOpen(false)}
                            >
                              Payout settings
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
              </div>

              {/* Mobile-only unified user capsule menu button (below lg) */}
              <div className="flex lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-slate-250 bg-white/95 p-1.5 pl-3 pr-1.5 hover:shadow-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="h-4.5 w-4.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg className="h-4.5 w-4.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  )}
                  {user ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-xs font-black text-white shadow-inner shrink-0 select-none">
                      {(profile?.full_name ?? user.email ?? "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 shadow-xl animate-pop-in pointer-events-auto">
          <nav className="flex flex-col gap-2">
            {/* Header if logged in */}
            {user && (
              <div className="px-3 py-2 bg-slate-50/50 rounded-xl mb-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged in as</p>
                <p className="text-sm text-brand-750 font-black truncate">{profile?.full_name ?? user.email}</p>
              </div>
            )}

            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-slate-150/80 my-2" />

            {/* Auth / Action links */}
            {!user ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 rounded-xl text-sm font-black text-white bg-brand-600 hover:bg-brand-700 transition text-center"
                >
                  Sign Up
                </Link>
                <Link
                  href="/signup/manager"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 mt-1 transition"
                >
                  Become a Host
                </Link>
              </>
            ) : (
              <>
                {role === "guest" && (
                  <>
                    <Link
                      href="/dashboard/bookings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      View Bookings
                    </Link>
                    <Link
                      href="/dashboard?tab=profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      Edit Profile
                    </Link>
                  </>
                )}
                {role === "manager" && (
                  <>
                    <Link
                      href="/manager/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/manager/create-hotel"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      Create New Hotel
                    </Link>
                    <Link
                      href="/manager/earnings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      Earnings
                    </Link>
                    <Link
                      href="/manager/payouts"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      Payout Settings
                    </Link>
                  </>
                )}
                {role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 px-3 rounded-xl text-sm font-black text-slate-800 hover:bg-brand-50/50 hover:text-brand-700 transition"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="block w-full py-2.5 px-3 text-left rounded-xl text-sm font-black text-red-650 hover:bg-red-50 transition cursor-pointer mt-1"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Search Overlay Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-xs pt-20 px-4 pointer-events-auto"
            onClick={() => setSearchModalOpen(false)}
          >
            <motion.div
              initial={{ y: -50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(false)}
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Close search"
                >
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div className="pt-4">
                  <AirbnbSearch />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mega Menus */}
      <AnimatePresence>
        {activeMega === "stays" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5rem)] w-full max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xl rounded-3xl p-8 z-30 grid grid-cols-3 gap-8 pointer-events-auto"
            onMouseEnter={() => handleMouseEnter("stays")}
            onMouseLeave={handleMouseLeave}
          >
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3">Browse by Type</h4>
              <ul className="space-y-2.5 text-sm font-bold text-slate-600">
                {dynamicData.propertyTypes.length > 0 ? (
                  dynamicData.propertyTypes.map((type) => (
                    <li key={type.name}>
                      <Link href={`/?type=${type.name}#hotels`} className="hover:text-brand-650 transition flex items-center justify-between">
                        <span>{type.name}s</span>
                        <span className="text-[10px] bg-slate-105 text-slate-500 px-2 py-0.5 rounded-full font-sans font-medium">{type.count}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li><Link href="/#categories" className="hover:text-brand-650 transition">Luxury Villas</Link></li>
                    <li><Link href="/#categories" className="hover:text-brand-650 transition">Boutique Stays</Link></li>
                    <li><Link href="/#categories" className="hover:text-brand-650 transition">Mountain Cabins</Link></li>
                    <li><Link href="/#categories" className="hover:text-brand-650 transition">Beachfront Resorts</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3">Popular Locations</h4>
              <ul className="space-y-2.5 text-sm font-bold text-slate-600">
                {dynamicData.cities.length > 0 ? (
                  dynamicData.cities.map((city) => (
                    <li key={city.name}>
                      <Link href={`/?location=${city.name}#hotels`} className="hover:text-brand-650 transition flex items-center justify-between">
                        <span>{city.name} Stays</span>
                        <span className="text-[10px] bg-slate-105 text-slate-500 px-2 py-0.5 rounded-full font-sans font-medium">{city.count}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li><Link href="/#hotels" className="hover:text-brand-650 transition">Guest Favourites</Link></li>
                    <li><Link href="/#hotels" className="hover:text-brand-650 transition">Work-Friendly Rooms</Link></li>
                    <li><Link href="/#hotels" className="hover:text-brand-650 transition">Newly Added Stays</Link></li>
                    <li><Link href="/#hotels" className="hover:text-brand-650 transition">Spontaneous Deals</Link></li>
                  </>
                )}
              </ul>
            </div>
            {dynamicData.featuredHotel ? (
              <Link href={`/hotels/${dynamicData.featuredHotel.id}`} className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 shadow-xs group cursor-pointer block">
                <Image 
                  src={getOptimizedImageUrl(dynamicData.featuredHotel.image_url || "https://images.unsplash.com/photo-1605649487212-47bdab064df7", 400, 80)} 
                  alt={dynamicData.featuredHotel.name}
                  fill
                  sizes="300px"
                  className="object-cover opacity-75 group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <span className="text-[8px] font-black text-gold-400 uppercase tracking-widest">Featured Stay</span>
                  <p className="text-xs font-bold leading-tight truncate max-w-[220px]">{dynamicData.featuredHotel.name}</p>
                  <p className="text-[10px] text-slate-350 mt-0.5">{dynamicData.featuredHotel.city}</p>
                </div>
              </Link>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 shadow-xs group cursor-pointer">
                <Image 
                  src={getOptimizedImageUrl("https://images.unsplash.com/photo-1605649487212-47bdab064df7", 400, 80)} 
                  alt="Featured Destination"
                  fill
                  sizes="300px"
                  className="object-cover opacity-75 group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <span className="text-[8px] font-black text-gold-400 uppercase tracking-widest">Featured</span>
                  <p className="text-xs font-bold leading-tight">Explore Lake City Udaipur</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeMega === "experiences" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5rem)] w-full max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xl rounded-3xl p-8 z-30 grid grid-cols-3 gap-8 pointer-events-auto"
            onMouseEnter={() => handleMouseEnter("experiences")}
            onMouseLeave={handleMouseLeave}
          >
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3">Activities</h4>
              <ul className="space-y-2.5 text-sm font-bold text-slate-600">
                <li><a href="#" className="hover:text-brand-650 transition">Water Rafting</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Backwater Cruises</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Mountain Hikes</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Yoga Retreats</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3">Guided Expeditions</h4>
              <ul className="space-y-2.5 text-sm font-bold text-slate-600">
                <li><a href="#" className="hover:text-brand-650 transition">Local Heritage Walks</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Private Campings</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Wildlife Safaris</a></li>
                <li><a href="#" className="hover:text-brand-650 transition">Family Excursions</a></li>
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 shadow-xs group cursor-pointer">
              <Image 
                src={getOptimizedImageUrl("https://images.unsplash.com/photo-1593693397690-362cb9666fc2", 400, 80)} 
                alt="Featured Experience"
                fill
                sizes="300px"
                className="object-cover opacity-75 group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-[8px] font-black text-gold-400 uppercase tracking-widest">Adventure</span>
                <p className="text-xs font-bold leading-tight">Sail the Kerala Backwaters</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
