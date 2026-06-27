"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

// Templates re-mount on every navigation, giving each manager page a quick
// enter animation. Skip the multi-step wizard / waiting screens so they don't
// re-animate on every step change.
export default function ManagerTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const skip = pathname.startsWith("/manager/create-hotel") || pathname.startsWith("/manager/waiting");

  if (skip) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
