"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { XIcon } from "@/components/icons";

/**
 * Responsive side panel: a right-hand drawer on >= md, a bottom sheet on mobile.
 * Slides in on the appropriate axis with an animated backdrop + exit.
 */
export function Panel({
  open,
  onClose,
  title,
  children,
  footer,
  widthClassName = "md:w-[28rem]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
}) {
  const [desktop, setDesktop] = useState(true);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const slide = desktop
    ? { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            {...slide}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
            className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-white shadow-xl
                       md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:rounded-none md:rounded-l-2xl ${widthClassName}`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
