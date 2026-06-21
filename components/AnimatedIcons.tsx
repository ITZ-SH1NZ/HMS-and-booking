"use client";

import { motion } from "motion/react";

// 1. Animated Shield Check
export function AnimatedShieldCheck({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
      initial="normal"
    >
      <motion.path
        d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"
        variants={{
          hover: { scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 10 } },
          normal: { scale: 1 }
        }}
      />
      <motion.path
        d="m9 12 2 2 4-4"
        variants={{
          hover: { pathLength: 1, opacity: 1 },
          normal: { pathLength: 0.2, opacity: 0.8 }
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

// 2. Animated Price Tag
export function AnimatedTag({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transformOrigin: "6px 6px" }}
      whileHover="hover"
    >
      <motion.path
        d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"
        variants={{
          hover: { 
            rotate: [-5, 12, -8, 6, 0],
            transition: { duration: 0.6, ease: "easeInOut" }
          }
        }}
      />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </motion.svg>
  );
}

// 3. Animated Lightning Zap
export function AnimatedZap({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      <motion.path
        d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
        variants={{
          hover: {
            scale: 1.15,
            y: -1,
            filter: "drop-shadow(0 0 4px currentColor)",
            transition: { type: "spring", stiffness: 500, damping: 12 }
          }
        }}
      />
    </motion.svg>
  );
}

// 4. Animated Lock
export function AnimatedLock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      {/* Lock Shackle */}
      <motion.path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        variants={{
          hover: { y: -2, transition: { type: "spring", stiffness: 300 } },
          normal: { y: 0 }
        }}
      />
      {/* Lock Body */}
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" />
      <path d="M12 15v3" />
    </motion.svg>
  );
}

// 5. Animated Headphones
export function AnimatedHeadphones({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      <motion.path
        d="M3 18v-6a9 9 0 0 1 18 0v6"
        variants={{
          hover: { y: -2, scaleY: 1.05, transition: { duration: 0.25, ease: "easeInOut" } }
        }}
      />
      <motion.path
        d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"
        variants={{
          hover: { scale: 1.08, transition: { duration: 0.2 } }
        }}
      />
    </motion.svg>
  );
}

// 6. Animated Map Pin
export function AnimatedMapPin({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      <motion.path
        d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
        variants={{
          hover: { y: -5, transition: { type: "spring", stiffness: 450, damping: 10 } }
        }}
      />
      <circle cx="12" cy="10" r="3" />
    </motion.svg>
  );
}

// 7. Animated Calendar
export function AnimatedCalendar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      <motion.rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        ry="2"
        variants={{
          hover: { scale: 1.03, transition: { type: "spring", stiffness: 350 } }
        }}
      />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </motion.svg>
  );
}

// 8. Animated Users
export function AnimatedUsers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover="hover"
    >
      <motion.path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        variants={{
          hover: { scale: 1.03, transition: { duration: 0.2 } }
        }}
      />
      <motion.circle cx="9" cy="7" r="4" />
      <motion.path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        variants={{
          hover: { x: 1, scale: 1.03, transition: { duration: 0.2 } }
        }}
      />
      <motion.path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        variants={{
          hover: { x: 1, transition: { duration: 0.2 } }
        }}
      />
    </motion.svg>
  );
}
