"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CheckInQrCardProps {
  qrCodeUrl: string;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "card" | "compact";
}

export function CheckInQrCard({
  qrCodeUrl,
  title = "Check-in QR Code",
  subtitle = "Show this QR code to the hotel staff on arrival for instant check-in, or at departure for checkout.",
  className = "",
  variant = "card",
}: CheckInQrCardProps) {
  const [open, setOpen] = useState(false);

  // Fullscreen Modal Content
  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 md:p-6" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          
          {/* Modal Box */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="relative bg-white p-8 md:p-10 rounded-[32px] shadow-2xl max-w-sm w-full flex flex-col items-center text-center border border-[#C5A880]/30 z-10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Large QR Code */}
            <img
              src={qrCodeUrl}
              alt="Booking QR Code Fullscreen"
              className="w-64 h-64 border border-slate-200 rounded-2xl p-3 bg-white shadow-md mb-6"
            />

            <h3 className="font-serif text-xl font-bold text-slate-900 mb-1.5">
              {title}
            </h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Present this QR code to the hotel front desk staff on arrival or departure.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`group relative cursor-zoom-in focus:outline-none rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-500 shrink-0 ${className}`}
          aria-label="Zoom QR code"
        >
          <img
            src={qrCodeUrl}
            alt="Booking QR Code"
            className="w-20 h-20 border border-slate-200 rounded-xl p-1.5 bg-white shadow-sm transition-transform group-hover:scale-[1.02] duration-200 md:w-24 md:h-24"
          />
          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors duration-200" />
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <section className={`rounded-3xl border border-slate-250/60 bg-white p-6 shadow-xs hover:shadow-md transition duration-300 flex flex-col items-center text-center w-full ${className}`}>
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider self-start mb-4">{title}</h2>
        
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative cursor-zoom-in focus:outline-none rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Zoom QR code"
        >
          <img
            src={qrCodeUrl}
            alt="Booking QR Code"
            className="w-36 h-36 border border-slate-200 rounded-xl p-1.5 bg-white shadow-sm transition-transform group-hover:scale-[1.02] duration-200"
          />
          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors duration-200" />
        </button>
        
        <span className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">
          Click to enlarge
        </span>

        <p className="text-[11px] text-slate-500 font-black mt-4 uppercase tracking-wider">
          Scan at Front Desk
        </p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 max-w-sm leading-relaxed">
          {subtitle}
        </p>
      </section>
      {modal}
    </>
  );
}
