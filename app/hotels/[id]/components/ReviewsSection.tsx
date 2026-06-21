"use client";

import { useState, useEffect } from "react";
import { StarIcon } from "@/components/icons";
import type { ReviewWithAuthor } from "@/lib/types";
import { Section } from "./SectionWrapper";
import { createClient } from "@/lib/supabase/client";
import ReviewForm from "@/components/ReviewForm";
import type { User } from "@supabase/supabase-js";

interface ReviewsSectionProps {
  hotelId: string;
  reviews: ReviewWithAuthor[];
  avgRating: number | null;
  reviewCount: number;
  ratingHistogram: Record<number, number>;
}

export function ReviewsSection({
  hotelId,
  reviews: initialReviews,
  avgRating,
  reviewCount,
  ratingHistogram,
}: ReviewsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedBooking, setHasCompletedBooking] = useState<boolean>(false);
  const [loadingBookingCheck, setLoadingBookingCheck] = useState<boolean>(true);
  const reviewsPerPage = 6;

  const totalPages = Math.ceil(initialReviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const paginatedReviews = initialReviews.slice(startIndex, startIndex + reviewsPerPage);

  useEffect(() => {
    const supabase = createClient();
    
    // Check if user is authenticated
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Gating ReviewForm: Check if this user has at least one completed booking at this hotel
        try {
          const { count, error } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("guest_id", currentUser.id)
            .eq("hotel_id", hotelId)
            .eq("status", "completed");

          if (!error && count && count > 0) {
            setHasCompletedBooking(true);
          }
        } catch (err) {
          console.error("Error checking bookings:", err);
        }
      }
      setLoadingBookingCheck(false);
    };

    checkUser();
  }, [hotelId]);

  // Render stars helper
  const renderStars = (rating: number, sizeClass = "h-4 w-4") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`${sizeClass} ${
              star <= rating ? "text-amber-500" : "text-slate-200"
            }`}
            filled={star <= rating}
          />
        ))}
      </div>
    );
  };

  return (
    <Section id="reviews" title="Guest Reviews">
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
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
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
                <StarIcon className="h-3.5 w-3.5 text-amber-500" filled />
                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-slate-400 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {paginatedReviews.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedReviews.map((review) => {
              const initials = review.reviewer_name
                ? review.reviewer_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "U";
              
              const reviewDate = new Date(review.created_at).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              });

              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Reviewer Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {review.reviewer_name || "Anonymous Guest"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Joined {new Date(review.reviewer_since).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {renderStars(review.rating, "h-3.5 w-3.5")}
                        <p className="text-[10px] text-slate-400 mt-1">{reviewDate}</p>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed italic line-clamp-4">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-bold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
          <p className="text-sm text-slate-500 font-medium">No reviews yet. Be the first to share your experience!</p>
        </div>
      )}

      {/* Review submission section */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        {user ? (
          loadingBookingCheck ? (
            <div className="flex items-center gap-2 justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
              <span className="text-xs text-slate-500 font-bold">Verifying booking status...</span>
            </div>
          ) : hasCompletedBooking ? (
            <ReviewForm hotelId={hotelId} />
          ) : (
            <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5 flex items-start gap-3">
              <div className="shrink-0 text-amber-600 mt-0.5">
                <StarIcon className="h-5 w-5" filled />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Only verified guests can review</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Reviews are gated to protect the integrity of our platform. You must have a completed booking at this hotel to leave a review.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center">
            <p className="text-xs text-slate-500 font-bold">
              Please{" "}
              <a href={`/login?redirect=/hotels/${hotelId}`} className="text-rose-600 hover:underline">
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
