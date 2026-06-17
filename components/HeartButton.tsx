"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons";

// Decorative wishlist toggle. Stops the click from triggering the card link.
// (Persisting favourites would need a `favorites` table — not wired up yet.)
export function HeartButton() {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved((s) => !s);
      }}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow transition hover:scale-110 ${
        saved ? "text-rose-600" : "text-slate-600"
      }`}
    >
      <HeartIcon className="h-4 w-4" filled={saved} />
    </button>
  );
}
