"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Check, ArrowRight, CreditCard, Sparkles, RefreshCw } from "lucide-react";

const THEMES = [
  {
    id: "luxury",
    name: "Luxury Gold",
    bgClass: "bg-gradient-to-br from-brand-950 via-slate-900 to-brand-900",
    textClass: "text-white",
    goldAccent: "text-gold-400",
    borderClass: "border-gold-500/30",
    desc: "Perfect for weddings, anniversaries, and luxury escapes.",
  },
  {
    id: "wood",
    name: "Classic Wood",
    bgClass: "bg-gradient-to-br from-amber-900 via-amber-950 to-stone-900",
    textClass: "text-amber-50",
    goldAccent: "text-amber-400",
    borderClass: "border-amber-700/30",
    desc: "Perfect for nature lovers, cabins, and cozy weekend retreats.",
  },
  {
    id: "celebration",
    name: "Celebration",
    bgClass: "bg-gradient-to-br from-rose-950 via-purple-950 to-slate-900",
    textClass: "text-white",
    goldAccent: "text-rose-400",
    borderClass: "border-rose-500/30",
    desc: "Perfect for birthdays, festivals, and special achievements.",
  },
  {
    id: "corporate",
    name: "Corporate",
    bgClass: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950",
    textClass: "text-slate-100",
    goldAccent: "text-sky-400",
    borderClass: "border-slate-700/30",
    desc: "Perfect for employee rewards, client gifts, and business perks.",
  },
];

const PRESETS = [2000, 5000, 10000, 20000, 50000];

export default function GiftCardsPage() {
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [voucherCode, setVoucherCode] = useState("");

  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  function handleAmountSelect(val: number) {
    setAmount(val);
    setCustomAmount("");
  }

  function handleCustomAmountChange(val: string) {
    setCustomAmount(val);
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  }

  function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientName.trim() || !recipientEmail.trim() || !senderName.trim()) return;

    setStatus("loading");
    setTimeout(() => {
      // Generate a mock voucher code
      const code = "NEST-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      setVoucherCode(code);
      setStatus("success");
    }, 1500);
  }

  function resetForm() {
    setStatus("idle");
    setRecipientName("");
    setRecipientEmail("");
    setSenderName("");
    setMessage("");
    setCustomAmount("");
    setAmount(5000);
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
            Gift Cards
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight font-serif sm:text-5xl">
            Give the Gift of <span className="font-serif italic font-medium text-brand-700">Travel</span>
          </h1>
          <p className="mt-3 text-base text-slate-500 font-medium">
            Treat your loved ones, friends, or team to unforgettable stays. Redeemable at any BookNest property.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            /* SUCCESS PANEL */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-12 text-center relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute -top-10 -left-10 h-32 w-32 bg-brand-100 rounded-full blur-2xl opacity-50" />
              <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-gold-100 rounded-full blur-2xl opacity-50" />

              <div className="relative z-10">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600 mx-auto mb-6">
                  <Check className="h-8 w-8" />
                </div>

                <h2 className="text-3xl font-extrabold text-slate-950 font-serif">Purchase Successful!</h2>
                <p className="mt-3 text-slate-600 text-sm font-medium">
                  An email containing the gift card voucher has been sent to <b className="text-slate-900">{recipientEmail}</b>.
                </p>

                {/* Animated Gift Card Render */}
                <div className="mt-8 mx-auto max-w-sm">
                  <div className={`rounded-2xl p-6 text-left aspect-[1.58/1] flex flex-col justify-between shadow-lg border ${selectedTheme.bgClass} ${selectedTheme.textClass} ${selectedTheme.borderClass}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black tracking-wider opacity-60">GIFT CARD</span>
                      <Gift className="h-6 w-6" />
                    </div>
                    <div className="my-auto">
                      <p className="text-xs opacity-70">For {recipientName || "Recipient"}</p>
                      <p className="text-2xl font-black mt-1">{inr(amount)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-wide font-serif">BookNest</span>
                        <span className="text-[5px] font-medium opacity-50">NEST EXCLUSIVE</span>
                      </div>
                      <span className="font-mono text-xs font-bold tracking-wider">{voucherCode}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-sm">
                    <span className="text-slate-500 font-bold">Voucher Code</span>
                    <span className="font-mono font-black text-brand-700 tracking-wider select-all">{voucherCode}</span>
                  </div>
                  <button
                    onClick={resetForm}
                    className="w-full bg-brand-750 bg-brand-700 hover:bg-brand-800 text-white py-3.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Purchase Another Gift Card
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* INTERACTIVE CUSTOMIZER */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Editor */}
              <div className="lg:col-span-7 space-y-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <form onSubmit={handlePurchase} className="space-y-6">
                  {/* 1. Choose Theme */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">1. Choose Theme</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedTheme(theme)}
                          className={`rounded-2xl p-3 text-left border cursor-pointer transition-all ${
                            selectedTheme.id === theme.id
                              ? "border-brand-500 ring-2 ring-brand-500/25 bg-brand-50/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className={`h-8 w-full rounded-lg mb-2 ${theme.bgClass}`} />
                          <span className="text-xs font-bold text-slate-800 block">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2.5 text-xs text-slate-400 font-medium">{selectedTheme.desc}</p>
                  </div>

                  {/* 2. Choose Amount */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">2. Select Amount</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleAmountSelect(p)}
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                            amount === p && !customAmount
                              ? "bg-slate-900 text-white"
                              : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {inr(p)}
                        </button>
                      ))}
                    </div>
                    
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="Enter custom amount"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                        min="500"
                        max="100000"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">Min: ₹500 · Max: ₹1,00,000</span>
                  </div>

                  {/* 3. Recipient Details */}
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">3. Personalize Card</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Name</label>
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Who is this for?"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-brand-500 focus:bg-white transition-all text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Email</label>
                        <input
                          type="email"
                          required
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="recipient@email.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-brand-500 focus:bg-white transition-all text-slate-850"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sender Name</label>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Your name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-brand-500 focus:bg-white transition-all text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Personal Message (optional)</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Add a warm message..."
                          rows={1}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-brand-500 focus:bg-white transition-all text-slate-850 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={status === "loading"}
                    className="w-full bg-brand-700 hover:bg-brand-800 text-white py-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" /> Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" /> Purchase Gift Card — {inr(amount)}
                      </>
                    )}
                  </motion.button>
                </form>
              </div>

              {/* Right Column: Live Preview */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
                <div className="bg-[#F4F2EC] rounded-3xl p-6 border border-slate-200/50">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Live Preview</h3>

                  {/* 3D-effect Card Container */}
                  <motion.div
                    whileHover={{ y: -5, rotateX: 2, rotateY: -2 }}
                    style={{ perspective: 1000 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`relative w-full aspect-[1.58/1] rounded-2xl p-6 flex flex-col justify-between shadow-xl border select-none ${selectedTheme.bgClass} ${selectedTheme.textClass} ${selectedTheme.borderClass}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black tracking-wider opacity-60 uppercase">Nest Gift Card</span>
                      <Gift className="h-5 w-5" />
                    </div>

                    <div className="my-auto">
                      <p className="text-xs opacity-70 font-bold">For {recipientName || "Recipient Name"}</p>
                      <p className="text-3xl font-black mt-1 tracking-tight">{inr(amount)}</p>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-xs font-black tracking-wide font-serif">BookNest</span>
                        <span className="text-[5px] font-medium opacity-50 uppercase tracking-widest">NEST EXCLUSIVE</span>
                      </div>
                      <span className="text-xs opacity-60 font-semibold">NEST-XXXX-XXXX</span>
                    </div>
                  </motion.div>

                  {/* Message Details Preview */}
                  <div className="mt-6 bg-white border border-slate-200/40 rounded-2xl p-4 text-xs space-y-3 shadow-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">To:</span>
                      <span className="text-slate-800 font-bold truncate max-w-[70%]">{recipientName || "—"} ({recipientEmail || "—"})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">From:</span>
                      <span className="text-slate-800 font-bold truncate max-w-[70%]">{senderName || "—"}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-2.5">
                      <span className="text-slate-400 font-bold block mb-1">Message:</span>
                      <p className="text-slate-600 leading-relaxed font-semibold italic">{message || "No message added."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
