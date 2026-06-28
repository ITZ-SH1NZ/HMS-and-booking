"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function LandingPageLoader() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if the user has already seen the loader in this session
    const hasSeen = sessionStorage.getItem("booknest_loader_seen");
    if (hasSeen === "true") {
      setLoading(false);
      return;
    }

    // Lock body scroll during animation
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = "";
      sessionStorage.setItem("booknest_loader_seen", "true");
    }, 2000); // 2 seconds total animation time

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted || !loading) return null;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
          }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#F8F7F4]"
        >
          <div className="flex flex-col items-center">
            {/* Beautiful Nest/House Logo Animation */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              {/* Outer glowing rings */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0.1, 0.2, 0.1],
                  scale: [1, 1.15, 1],
                }}
                transition={{ 
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full bg-brand-500/10"
              />
              
              {/* SVG Drawing Logo */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-brand-800"
              >
                {/* Roof/House Outline */}
                <motion.path
                  d="M3 10L12 3L21 10M5 9V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
                {/* Nest Arc 1 */}
                <motion.path
                  d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                  stroke="var(--color-gold-500, #d97706)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                />
                {/* Nest Arc 2 */}
                <motion.path
                  d="M7 16C7 16 9 18.5 12 18.5C15 18.5 17 16 17 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                />
                {/* Stylized Bird/Egg in Nest */}
                <motion.circle
                  cx="12"
                  cy="12"
                  r="2"
                  fill="var(--color-gold-500, #d97706)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 10 }}
                />
              </svg>
            </div>

            {/* Staggered text animations */}
            <div className="mt-6 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="font-serif text-2xl font-bold tracking-wide text-slate-900"
              >
                BookNest
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
                className="mt-1.5 text-xs font-medium uppercase tracking-widest text-slate-500"
              >
                Curating your perfect stay
              </motion.p>
            </div>
            
            {/* Micro progress bar */}
            <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                className="h-full w-full bg-brand-700"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
