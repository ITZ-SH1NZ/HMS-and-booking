"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, ArrowUp, Check } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";

export function Footer() {
  const [time, setTime] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { currency, locale, setCurrencyAndLocale } = useCurrency();

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setTime(new Date().toLocaleTimeString("en-IN", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const languagesList = [
    { code: "en-IN", name: "English (IN)" },
    { code: "en-US", name: "English (US)" },
    { code: "de-DE", name: "Deutsch (DE)" },
    { code: "es-ES", name: "Español (ES)" },
  ];

  const currenciesList = [
    { code: "INR", name: "INR (₹)" },
    { code: "USD", name: "USD ($)" },
    { code: "EUR", name: "EUR (€)" },
    { code: "GBP", name: "GBP (£)" },
  ];

  const currentLanguageLabel = languagesList.find((l) => l.code === locale)?.name || "English (IN)";
  const currentCurrencyLabel = currenciesList.find((c) => c.code === currency)?.name || "INR (₹)";


  return (
    <footer className="relative bg-white text-slate-600 border-t border-slate-200/80 overflow-hidden">
      {/* Organic Leaf Watermark Background */}
      <div className="absolute right-2 bottom-2 text-brand-700/3 pointer-events-none select-none z-0">
        <svg viewBox="0 0 24 24" className="w-56 h-56 fill-current">
          <path d="M17 8C8 10 4 19 4 19S13 15 16 8C17 5.6 15.6 3 12 3C8.4 3 6.6 6 6.6 6S8.4 9 12 9C15.6 9 17 8 17 8Z" />
        </svg>
      </div>

      {/* Main Footer Links */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Logo and Tagline Column */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl">
              <Image
                src="/logo-mark.png"
                alt="BookNest Logo"
                width={48}
                height={48}
                className="h-12 w-auto object-contain"
                unoptimized={true}
              />
              <div className="flex flex-col justify-center">
                <span className="text-2xl font-black tracking-tight text-brand-700 leading-none">
                  BookNest
                </span>
                <span className="text-[9px] font-black tracking-widest text-gold-600 uppercase mt-1.5">
                  Stays that feel like home
                </span>
              </div>
            </Link>
            <p className="max-w-xs text-sm text-slate-500 leading-relaxed font-semibold">
              Book handpicked hotels, resorts, and villas across India and beyond. Trusted by thousands of happy travelers.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                aria-label="BookNest on X (formerly Twitter)"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-650 hover:bg-brand-50 hover:text-brand-700 hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="#"
                aria-label="BookNest on Facebook"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-650 hover:bg-brand-50 hover:text-brand-700 hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
              <a
                href="#"
                aria-label="BookNest on Instagram"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-650 hover:bg-brand-50 hover:text-brand-700 hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 1: Discover */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Discover</h4>
            <ul className="flex flex-col gap-2.5 text-sm font-semibold">
              <li>
                <Link href="/#categories" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Resorts & Villas
                </Link>
              </li>
              <li>
                <Link href="/#categories" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Luxury Stays
                </Link>
              </li>
              <li>
                <Link href="/#categories" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Nature Retreats
                </Link>
              </li>
              <li>
                <Link href="/#categories" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Budget Escapes
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Host */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Hosting</h4>
            <ul className="flex flex-col gap-2.5 text-sm font-semibold">
              <li>
                <Link href="/signup/manager" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Become a Host
                </Link>
              </li>
              <li>
                <Link href="/signup/manager" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Host Resources
                </Link>
              </li>
              <li>
                <Link href="/signup/manager" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Community Forum
                </Link>
              </li>
              <li>
                <Link href="/signup/manager" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Insurance & Protection
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Support</h4>
            <ul className="flex flex-col gap-2.5 text-sm font-semibold">
              <li>
                <Link href="#" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Trust & Safety
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Cancellation Options
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-brand-600 hover:translate-x-1 transition-all duration-200 inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded px-0.5">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider line */}
        <div className="my-10 border-t border-slate-200/80" />

        {/* Bottom Bar: Copyright, Live Clock, Interactive Selector, Back to Top */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-semibold relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>&copy; {new Date().getFullYear()} BookNest Inc. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-brand-600 transition duration-200">Privacy Policy</a>
              <a href="#" className="hover:text-brand-600 transition duration-200">Terms of Service</a>
              <a href="#" className="hover:text-brand-600 transition duration-200">Sitemap</a>
            </div>
            {time && (
              <>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="text-slate-400 font-medium">Local Time: {time} IST</span>
              </>
            )}
          </div>

          {/* Actions: Selector and Back to Top */}
          <div className="flex flex-wrap items-center gap-6 justify-center relative">
            {/* Interactive Language/Currency Selector Button */}
            <div className="relative">
              <button
                onClick={() => setPickerOpen(!pickerOpen)}
                className="flex items-center gap-1.5 text-slate-650 hover:text-brand-600 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md px-1 py-0.5"
              >
                <Globe className="h-4 w-4" />
                <span>{currentLanguageLabel} • {currentCurrencyLabel}</span>
              </button>

              {/* Language/Currency Picker Popover */}
              <AnimatePresence>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-3 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 grid grid-cols-1 gap-4 text-left"
                    >
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Language</p>
                        <div className="grid grid-cols-1 gap-1">
                          {languagesList.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setCurrencyAndLocale(currency, lang.code);
                                setPickerOpen(false);
                              }}
                              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-55 transition text-left cursor-pointer"
                            >
                              <span>{lang.name}</span>
                              {locale === lang.code && <Check className="h-3.5 w-3.5 text-brand-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Currency</p>
                        <div className="grid grid-cols-2 gap-1">
                          {currenciesList.map((curr) => (
                            <button
                              key={curr.code}
                              onClick={() => {
                                setCurrencyAndLocale(curr.code, locale);
                                setPickerOpen(false);
                              }}
                              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-55 transition text-left cursor-pointer"
                            >
                              <span>{curr.name}</span>
                              {currency === curr.code && <Check className="h-3.5 w-3.5 text-brand-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Back to Top */}
            <button
              onClick={scrollToTop}
              className="group flex items-center gap-1 text-slate-650 hover:text-brand-600 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md px-1 py-0.5"
            >
              <span>Back to top</span>
              <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 group-hover:bg-brand-50 transition transform group-hover:-translate-y-0.5">
                <ArrowUp className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
