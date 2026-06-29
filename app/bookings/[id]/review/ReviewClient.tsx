"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { StarIcon } from "@/components/icons";
import { submitGuestReviewAndCheckout } from "../../actions";
import { ShieldCheck, Calendar, MapPin, Building, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReviewClientProps {
  booking: {
    id: string;
    hotel_id: string;
    check_in: string;
    check_out: string;
    status: string;
    hotels: {
      id: string;
      name: string;
      location: string;
      image_url: string | null;
    };
    rooms: {
      id: string;
      name: string;
    };
  };
}

const fmtDate = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function ReviewClient({ booking }: ReviewClientProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitGuestReviewAndCheckout(booking.id, rating, comment);
    
    if (res.ok) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#0F5A46", "#C9A24D", "#F8F7F4"],
      });
      setSuccess(true);
    } else {
      setError(res.error ?? "Failed to submit review. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[32px] border border-[#C5A880]/25 bg-white p-8 shadow-xl backdrop-blur-md text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-5 shadow-inner">
            <ShieldCheck className="h-9 w-9 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 font-serif leading-tight">
            Checkout Complete!
          </h1>
          <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
            Thank you for staying at <strong>{booking.hotels.name}</strong>. Your checkout is complete, and your review has been published.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-400 font-medium">
            Your feedback helps us make BookNest stays feel like home.
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard/bookings"
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition shadow-md hover:shadow-lg text-center"
            >
              View My Bookings
            </Link>
            <Link
              href="/"
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition text-center"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 hover:text-brand-800 transition group mb-8"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl"
      >
        {/* Header Cover Card */}
        <div className="relative bg-brand-900 px-6 py-10 text-white text-left overflow-hidden">
          {/* Subtle gold etching motif */}
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-brand-800/20 to-transparent pointer-events-none" />
          
          <span className="text-[10px] font-black uppercase tracking-widest text-gold-400">
            {booking.status === "checked_in" ? "Checkout & Review" : "Share Your Feedback"}
          </span>
          <h1 className="mt-1.5 font-serif text-2xl font-black leading-tight tracking-tight">
            How was your stay?
          </h1>
          <p className="mt-1 text-xs text-brand-200/90 font-medium">
            Reviewing your stay at {booking.hotels.name}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-left">
          {/* Stay Info Card */}
          <div className="flex gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            {booking.hotels.image_url ? (
              <img
                src={booking.hotels.image_url}
                alt={booking.hotels.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                <Building className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="text-sm font-black text-slate-800 truncate">{booking.hotels.name}</h2>
              <p className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-brand-500" /> {booking.hotels.location}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-1">
                <Calendar className="h-3.5 w-3.5 text-brand-500" /> {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)}
              </p>
            </div>
          </div>

          {/* Rating Section */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-450">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = hoveredRating !== null ? star <= hoveredRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="text-gold-500 hover:scale-110 active:scale-95 transition p-1 focus:outline-none"
                    aria-label={`Rate ${star} Stars`}
                  >
                    <StarIcon className="h-9 w-9 transition duration-150" filled={isFilled} />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-bold text-slate-500">
                {hoveredRating !== null 
                  ? ["Disappointing", "Fair", "Good", "Very Good", "Excellent"][hoveredRating - 1]
                  : ["Disappointing", "Fair", "Good", "Very Good", "Excellent"][rating - 1]
                }
              </span>
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-450">
              Share your experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required
              placeholder="What did you love about your stay? How was the hospitality, room, and service?"
              className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition placeholder-slate-400 leading-relaxed"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs font-semibold text-brand-700 leading-relaxed">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                {booking.status === "checked_in" ? "Complete Checkout & Submit" : "Submit Review"}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
