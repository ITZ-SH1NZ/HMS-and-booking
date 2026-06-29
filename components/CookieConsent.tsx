"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Shield, Sliders, Lock, X } from "lucide-react";

const STORAGE_KEY = "booknest-cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const isHomepage = window.location.pathname === "/";
        const hasSeenLoader = sessionStorage.getItem("booknest_loader_seen") === "true";
        // If the landing page loader is going to play, wait 4800ms (3.85s loader + 0.95s curtain slide + buffer).
        // Otherwise, slide in after 800ms.
        const delay = isHomepage && !hasSeenLoader ? 4800 : 800;

        const t = setTimeout(() => setShow(true), delay);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked (private mode) — don't show.
    }
  }, []);

  function decide(value: "accepted" | "necessary") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "180%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "180%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 150 }}
          className="fixed bottom-6 left-6 right-6 z-[100] mx-auto max-w-7xl"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
        >
          <div className="w-full relative overflow-hidden rounded-[24px] border border-[#E7E2D8] bg-[#FAF8F5] px-8 py-7 sm:px-10 sm:py-8 shadow-[0_25px_60px_-15px_rgba(14,56,41,0.25)]">
            {/* Elegant botanical leaf SVG overlay in bottom-left corner */}
            <div className="absolute bottom-0 left-0 pointer-events-none select-none z-0">
              <svg
                className="h-36 w-36"
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="sageLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9AB09E" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#5A6F5E" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E5D8C0" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#C5A880" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="oliveLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B5C5B8" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#788F7C" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                
                {/* Main branch stem */}
                <path
                  d="M-10,170 Q35,120 25,30"
                  stroke="#8C9A8E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                
                {/* Detailed Leaves with Gradients */}
                <path d="M18,125 C10,98 42,95 38,122 C34,132 24,132 18,125 Z" fill="url(#sageLeaf)" />
                <path d="M10,140 C2,110 32,112 24,138 C18,144 12,146 10,140 Z" fill="url(#goldLeaf)" />
                <path d="M26,105 C18,75 52,78 44,102 C38,110 30,110 26,105 Z" fill="url(#oliveLeaf)" />
                <path d="M32,82 C28,52 62,60 48,82 C42,90 35,88 32,82 Z" fill="url(#sageLeaf)" />
                <path d="M42,108 C38,85 68,90 56,108 C50,112 44,112 42,108 Z" fill="url(#goldLeaf)" />
                <path d="M28,52 C26,25 56,32 42,50 C38,55 32,55 28,52 Z" fill="url(#oliveLeaf)" />
                <path d="M48,75 C45,52 75,58 60,75 C54,80 50,80 48,75 Z" fill="url(#goldLeaf)" />
                <path d="M24,28 C24,5 50,10 38,28 C34,32 28,32 24,28 Z" fill="url(#sageLeaf)" />
              </svg>
            </div>

            {/* Close Button */}
            <button
              onClick={() => decide("necessary")}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-450 hover:bg-slate-200/50 hover:text-slate-755 transition z-10"
              aria-label="Close cookie consent"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Main Content Layout */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
              {/* 1. Left Column: Branded Shield Logo & Text (No vertical divider between logo and text) */}
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left flex-[1.8] w-full lg:w-auto">
                <img
                  src="/logo-mark.png"
                  alt="BookNest Logo"
                  className="h-16 w-16 object-contain shrink-0 filter drop-shadow-md"
                />
                <div className="space-y-1.5">
                  <h2 className="font-serif text-2xl font-black text-[#0E3829] tracking-tight leading-tight">
                    Your experience, your choice
                  </h2>
                  <p className="text-xs font-semibold text-[#5A655D] leading-relaxed max-w-2xl">
                    We use cookies to enhance your experience, analyse site traffic, and personalise content.
                    You can choose which cookies you'd like to allow.
                  </p>
                </div>
              </div>

              {/* 2. Middle Column: Three Privacy Features */}
              <div className="flex justify-center lg:justify-start items-center gap-4 w-full lg:w-auto">
                <div className="hidden lg:block h-14 w-px bg-[#E7E2D8] mr-2" />
                <div className="flex items-center gap-4 sm:gap-6 text-[#0E3829]">
                  <div className="flex flex-col items-center gap-2 text-center min-w-[75px]">
                    <Shield className="h-5.5 w-5.5 text-[#C5A880]" strokeWidth={1.5} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Secure & Trusted</span>
                  </div>
                  <div className="h-9 w-px bg-[#E7E2D8]" />
                  <div className="flex flex-col items-center gap-2 text-center min-w-[75px]">
                    <Sliders className="h-5.5 w-5.5 text-[#C5A880]" strokeWidth={1.5} />
                    <span className="text-[9px] font-black uppercase tracking-wider">You're in Control</span>
                  </div>
                  <div className="h-9 w-px bg-[#E7E2D8]" />
                  <div className="flex flex-col items-center gap-2 text-center min-w-[75px]">
                    <Lock className="h-5.5 w-5.5 text-[#C5A880]" strokeWidth={1.5} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Data Protected</span>
                  </div>
                </div>
                <div className="hidden lg:block h-14 w-px bg-[#E7E2D8] ml-2" />
              </div>

              {/* 3. Right Column: Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
                <button
                  onClick={() => decide("accepted")}
                  className="w-full sm:w-auto rounded-xl bg-[#0E3829] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#08241a] transition shadow-md hover:shadow-lg text-center whitespace-nowrap"
                >
                  Accept All Cookies
                </button>
                <button
                  onClick={() => decide("necessary")}
                  className="w-full sm:w-auto rounded-xl border border-[#C5A880] bg-transparent px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#0E3829] hover:bg-[#0E3829]/5 transition text-center whitespace-nowrap"
                >
                  Customize
                </button>
                <button
                  onClick={() => decide("necessary")}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0E3829] hover:underline transition text-center whitespace-nowrap"
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Bottom Cookie Policy Text */}
            <div className="mt-6 border-t border-[#E7E2D8]/60 pt-3.5 text-center text-[10px] text-slate-400 font-semibold">
              By continuing, you agree to our{" "}
              <Link
                href="/privacy"
                className="font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                Cookie Policy
              </Link>
              .
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
