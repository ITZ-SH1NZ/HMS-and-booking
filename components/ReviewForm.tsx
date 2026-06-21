"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarIcon } from "@/components/icons";

export default function ReviewForm({
  hotelId,
}: {
  hotelId: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  async function submitReview() {
  try {
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .insert({
        hotel_id: hotelId,
        user_id: user.id,
        rating,
        comment,
      });

    if (error) {
      console.error(error);
      alert("Failed to submit review");
      return;
    }

    alert("Review submitted successfully!");

    window.location.reload();
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        Add Review
      </h2>

      <div className="mb-3">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Rating
        </label>

        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="text-gold-500 hover:scale-110 transition duration-150 p-1"
            >
              <StarIcon className="h-7 w-7" filled={star <= rating} />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium">
          Comment
        </label>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          rows={4}
        />
      </div>

      <button
  onClick={submitReview}
  disabled={loading}
  className="rounded-lg bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
>
  {loading ? "Submitting..." : "Submit Review"}
</button>
    </div>
  );
}