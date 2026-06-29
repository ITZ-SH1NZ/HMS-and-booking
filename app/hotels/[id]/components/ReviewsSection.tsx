"use client";

import { useState, useEffect, useMemo } from "react";
import { StarIcon } from "@/components/icons";
import type { ReviewWithAuthor } from "@/lib/types";
import { Section } from "./SectionWrapper";
import { createClient } from "@/lib/supabase/client";
import ReviewForm from "@/components/ReviewForm";
import type { User } from "@supabase/supabase-js";
import { Search, CheckCircle2, MessageSquare, ShieldCheck, X } from "lucide-react";

interface ReviewsSectionProps {
  hotelId: string;
  reviews: ReviewWithAuthor[];
  avgRating: number | null;
  reviewCount: number;
  ratingHistogram: Record<number, number>;
}

export function ReviewsSection({
  hotelId,
  reviews,
  avgRating,
  reviewCount,
  ratingHistogram,
}: ReviewsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  // Gating state
  const [user, setUser] = useState<User | null>(null);
  const [completedBookingsCount, setCompletedBookingsCount] = useState<number>(0);
  const [userReviewsCount, setUserReviewsCount] = useState<number>(0);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();
    
    const checkEligibility = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        try {
          const [bookingsRes, reviewsRes] = await Promise.all([
            supabase
              .from("bookings")
              .select("*", { count: "exact", head: true })
              .eq("guest_id", currentUser.id)
              .eq("hotel_id", hotelId)
              .eq("status", "completed"),
            supabase
              .from("reviews")
              .select("*", { count: "exact", head: true })
              .eq("user_id", currentUser.id)
              .eq("hotel_id", hotelId)
          ]);

          setCompletedBookingsCount(bookingsRes.count || 0);
          setUserReviewsCount(reviewsRes.count || 0);
        } catch (err) {
          console.error("Error checking eligibility:", err);
        }
      }
      setLoadingEligibility(false);
    };

    checkEligibility();
  }, [hotelId]);

  // Filtered reviews based on search term and rating selection
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesRating = selectedRating === null || review.rating === selectedRating;
      const matchesSearch =
        searchTerm.trim() === "" ||
        (review.comment &&
          review.comment.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (review.reviewer_name &&
          review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesRating && matchesSearch;
    });
  }, [reviews, selectedRating, searchTerm]);

  // Paginated reviews to show
  const displayedReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleCount);
  }, [filteredReviews, visibleCount]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [searchTerm, selectedRating]);

  // Helper to render stars
  const renderStars = (rating: number, sizeClass = "h-3.5 w-3.5") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`${sizeClass} ${
              star <= rating ? "text-gold-500" : "text-slate-200"
            }`}
            filled={star <= rating}
          />
        ))}
      </div>
    );
  };

  // Helper to highlight search term in text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Helper to escape regex special characters
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  // Format stay details text
  const formatStayDetails = (review: ReviewWithAuthor) => {
    if (!review.stay_details) return null;
    const { nights, room_name, check_out } = review.stay_details;
    const stayNights = nights ? `${nights} night${nights > 1 ? "s" : ""}` : "stay";
    const date = new Date(check_out).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    return `Stayed ${stayNights} · ${room_name} · ${date}`;
  };

  return (
    <Section id="reviews" title="Guest Reviews">
      {/* 1. Header Aggregates */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 mb-8">
        {/* Aggregates Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <span className="text-5xl font-black text-slate-900 tracking-tight">
            {avgRating !== null ? avgRating.toFixed(1) : "0.0"}
          </span>
          <div className="mt-2">
            {renderStars(Math.round(avgRating ?? 0), "h-5 w-5")}
          </div>
          <span className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider">
            {reviewCount} verified review{reviewCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Histogram */}
        <div className="flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingHistogram[rating] ?? 0;
            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3 text-xs font-semibold">
                <span className="w-3 text-slate-600 text-right">{rating}</span>
                <StarIcon className="h-3.5 w-3.5 text-gold-500" filled />
                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-slate-400 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Filter Bar (Directly on Page) */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-5 mb-6">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reviews..."
              className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Rating Filters (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Stars:
            </span>
            <button
              type="button"
              onClick={() => setSelectedRating(null)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                selectedRating === null
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((rating) => {
              const isSelected = selectedRating === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSelectedRating(isSelected ? null : rating)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{rating}</span>
                  <StarIcon className="h-2.5 w-2.5 text-gold-500" filled />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Reviews Grid */}
      {displayedReviews.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedReviews.map((review) => {
              const initials = review.reviewer_name
                ? review.reviewer_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "G";
              
              const stayText = formatStayDetails(review);

              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Review Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-bold text-sm border border-brand-100">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {review.reviewer_name
                              ? highlightText(review.reviewer_name, searchTerm)
                              : "Verified Guest"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100/60 uppercase tracking-wide">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Verified Stay
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {renderStars(review.rating, "h-3.5 w-3.5")}
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Stay Context */}
                    {stayText && (
                      <p className="text-[10.5px] font-semibold text-slate-400 mb-2.5">
                        {stayText}
                      </p>
                    )}

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        &ldquo;{highlightText(review.comment, searchTerm)}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More Button */}
          {filteredReviews.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="rounded-xl border border-slate-300 px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
              >
                Show more reviews ({filteredReviews.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : reviews.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50 flex flex-col items-center justify-center">
          <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 font-bold">No matching reviews found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search keywords or star filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedRating(null);
            }}
            className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
          <p className="text-sm text-slate-500 font-medium">
            No reviews yet. Be the first to share your experience after your stay!
          </p>
        </div>
      )}

      {/* 4. Gated Review Submission Section */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        {user ? (
          loadingEligibility ? (
            <div className="flex items-center gap-2 justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
              <span className="text-xs text-slate-500 font-bold">Verifying eligibility...</span>
            </div>
          ) : completedBookingsCount > userReviewsCount ? (
            <ReviewForm hotelId={hotelId} />
          ) : completedBookingsCount > 0 ? (
            <div className="rounded-2xl bg-brand-50/50 border border-brand-100 p-5 flex items-start gap-3">
              <div className="shrink-0 text-brand-600 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Thank you for your feedback!</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  You have already reviewed your stay at this hotel. To write another review, you must complete a new booking.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
              <div className="shrink-0 text-slate-700 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Verified Reviews Only
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  At BookNest, we ensure all reviews are written by actual guests. To leave a review, please use the **Checkout QR Code** provided by the front desk staff during checkout, or submit it directly from your **Booking Details** portal once your stay is marked as completed.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center">
            <p className="text-xs text-slate-500 font-bold">
              Please{" "}
              <a href={`/login?redirect=/hotels/${hotelId}`} className="text-brand-600 hover:underline">
                log in
              </a>{" "}
              to write a review. Gated to verified guests only.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
