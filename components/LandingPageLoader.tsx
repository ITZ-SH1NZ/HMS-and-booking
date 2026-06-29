"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const WORDS = ["Bespoke", "Timeless", "Exclusive"];

export function LandingPageLoader() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0); // 0, 1, 2 for WORDS, 3 for Blooming Leaf

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

    // Cycle through the editorial words (800ms per word)
    const wordInterval = setInterval(() => {
      setStep((prev) => {
        if (prev < WORDS.length) {
          return prev + 1;
        } else {
          clearInterval(wordInterval);
          return prev;
        }
      });
    }, 800);

    // End loading state after the leaf has fully bloomed (total ~3.9s)
    const endTimer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = "";
      sessionStorage.setItem("booknest_loader_seen", "true");
    }, 3950);

    return () => {
      clearInterval(wordInterval);
      clearTimeout(endTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ y: "0%" }}
          exit={{
            y: "-100%",
            transition: { duration: 0.95, ease: [0.76, 0, 0.24, 1] },
          }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#0E3829] select-none"
        >
          {/* Subtle elegant thin gold border at the bottom of the curtain */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C5A880]/60 to-transparent" />

          {/* Ticker / Blooming Leaf Presenter */}
          <div className="relative w-full flex flex-col items-center justify-center px-6 min-h-[280px]">
            {/* 1. Word Ticker (Simultaneous Cross-Fade) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
              <AnimatePresence>
                {step < WORDS.length && (
                  <motion.div
                    key={`word-${step}`}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{
                      duration: 0.65,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute font-serif text-3xl sm:text-5xl tracking-wide font-light text-[#C5A880]"
                  >
                    {WORDS[step]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Blooming Leaf & Brand Reveal */}
            <AnimatePresence>
              {step >= WORDS.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-6"
                >
                  {/* Custom Drawn Blooming Gold Laurel Branch SVG with Leading Light Shimmer */}
                  <svg
                    width="160"
                    height="160"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#C5A880]"
                  >
                    {/* STEM ANIMATION */}
                    {/* Base Gold Stem */}
                    <motion.path
                      d="M50 85 C48 60 48 40 50 15"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.1, ease: "easeInOut" }}
                    />
                    {/* Leading Light Stem */}
                    <motion.path
                      d="M50 85 C48 60 48 40 50 15"
                      stroke="#FAF8F5"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    
                    {/* LEFT LEAF ANIMATION */}
                    {/* Base Gold Left Leaf */}
                    <motion.path
                      d="M49 55 C32 48 24 36 22 38 C20 40 34 52 49 55"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.25, duration: 0.9, ease: "easeInOut" }}
                    />
                    {/* Leading Light Left Leaf */}
                    <motion.path
                      d="M49 55 C32 48 24 36 22 38 C20 40 34 52 49 55"
                      stroke="#FAF8F5"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.25, duration: 0.65, ease: "easeOut" }}
                    />

                    {/* RIGHT LEAF ANIMATION */}
                    {/* Base Gold Right Leaf */}
                    <motion.path
                      d="M51 55 C68 48 76 36 78 38 C80 40 66 52 51 55"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.25, duration: 0.9, ease: "easeInOut" }}
                    />
                    {/* Leading Light Right Leaf */}
                    <motion.path
                      d="M51 55 C68 48 76 36 78 38 C80 40 66 52 51 55"
                      stroke="#FAF8F5"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.25, duration: 0.65, ease: "easeOut" }}
                    />

                    {/* TOP LEAF ANIMATION */}
                    {/* Base Gold Top Left */}
                    <motion.path
                      d="M50 35 C34 28 40 16 50 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.9, ease: "easeInOut" }}
                    />
                    {/* Leading Light Top Left */}
                    <motion.path
                      d="M50 35 C34 28 40 16 50 10"
                      stroke="#FAF8F5"
                      strokeWidth="1"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.65, ease: "easeOut" }}
                    />

                    {/* Base Gold Top Right */}
                    <motion.path
                      d="M50 35 C66 28 60 16 50 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.9, ease: "easeInOut" }}
                    />
                    {/* Leading Light Top Right */}
                    <motion.path
                      d="M50 35 C66 28 60 16 50 10"
                      stroke="#FAF8F5"
                      strokeWidth="1"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.65, ease: "easeOut" }}
                    />
                  </svg>

                  {/* Brand Fade-in */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col gap-2 text-center"
                  >
                    <h2 className="font-serif text-3xl font-light text-[#FAF8F5] tracking-widest">
                      BookNest
                    </h2>
                    <p className="text-[9px] font-black tracking-[0.3em] uppercase text-[#C5A880]/90">
                      Stays that feel like home
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Micro-Indicator */}
          <div className="absolute bottom-12 flex flex-col items-center gap-2">
            <span className="text-[8px] text-[#C5A880]/50 uppercase tracking-[0.4em] font-sans font-black">
              BookNest Stays &bull; Vol. 01
            </span>
            {/* Tiny progress line */}
            <div className="h-[1px] w-12 bg-[#C5A880]/15 overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 3.6, ease: "easeInOut" }}
                className="h-full w-full bg-[#C5A880]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
