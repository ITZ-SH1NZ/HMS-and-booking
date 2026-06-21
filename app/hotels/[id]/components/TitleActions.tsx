"use client";

import { useState, useEffect } from "react";
import { ShareIcon } from "@/components/icons";

export function TitleActions() {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  const getPageUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const url = getPageUrl();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this amazing stay: " + url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("Check out this amazing stay!")}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent("Amazing Stay Recommendation")}&body=${encodeURIComponent("Check out this stay: " + url)}`;

  return (
    <div className="flex items-center gap-3 relative">
      {/* Share Button */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition shadow-sm cursor-pointer"
      >
        <ShareIcon className="h-4 w-4 text-slate-500" />
        Share
      </button>

      {/* Save / Heart Button */}
      <button
        type="button"
        onClick={() => setSaved(!saved)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer select-none"
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      >
        <svg
          className={`h-4 w-4 transition-all duration-300 ${
            saved 
              ? "fill-brand-500 stroke-brand-500 scale-110" 
              : "fill-none stroke-slate-500 hover:stroke-brand-500"
          }`}
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span>{saved ? "Saved" : "Save"}</span>
      </button>

      {/* Modern Share Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative bg-white rounded-3xl p-6 w-full max-w-md border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Share this stay</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Link Copy Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Link</label>
              <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 pl-4 items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 truncate mr-4">{url}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer select-none active:scale-95 ${
                    copied 
                      ? "bg-brand-600 text-white" 
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Social options list */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Share via</label>
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition hover:shadow-sm cursor-pointer group"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-600 group-hover:scale-110 transition duration-200 shrink-0">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.012 0C5.398 0 .019 5.38 0 11.99c0 2.115.553 4.178 1.602 5.993L0 24l6.15-1.612a11.953 11.953 0 005.856 1.6c6.613 0 11.993-5.38 12-11.99C24 5.38 18.623 0 12.012 0zm6.076 16.99c-.273.766-1.583 1.393-2.185 1.482-.41.06-1.62.148-3.418-.553-2.812-1.1-4.63-3.957-4.77-4.148-.142-.19-1.125-1.492-1.125-2.847 0-1.355.71-2.022.955-2.302.247-.28.547-.35.73-.35h.52c.163 0 .382-.06.6.464.218.52.738 1.79.8 1.918.064.128.106.277.02.447-.086.17-.128.276-.255.425-.128.15-.268.337-.38.45-.123.123-.25.257-.107.502.142.246.635 1.043 1.362 1.69.933.83 1.72 1.085 1.964 1.207.245.122.387.1.53-.064.14-.162.6-1.02.76-1.37.164-.35.328-.29.547-.208.22.08 1.393.655 1.633.775.24.12.398.18.458.28.06.1.06.582-.213 1.348z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">WhatsApp</p>
                    <p className="text-[10px] text-slate-400 font-medium">Send to a friend</p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={emailUrl}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition hover:shadow-sm cursor-pointer group"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition duration-200 shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">Email</p>
                    <p className="text-[10px] text-slate-400 font-medium">Send via mail</p>
                  </div>
                </a>

                {/* X / Twitter */}
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition hover:shadow-sm cursor-pointer group"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-900 group-hover:scale-110 transition duration-200 shrink-0">
                    <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">X / Twitter</p>
                    <p className="text-[10px] text-slate-400 font-medium">Share updates</p>
                  </div>
                </a>

                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition hover:shadow-sm cursor-pointer group"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 transition duration-200 shrink-0">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">Facebook</p>
                    <p className="text-[10px] text-slate-400 font-medium">Post to feed</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
