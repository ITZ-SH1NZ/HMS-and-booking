"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons";

// Decorative wishlist toggle. Stops the click from triggering the card link.
// (Persisting favourites would need a `favorites` table — not wired up yet.)
export function HeartButton() {
  const [saved, setSaved] = useState(false);
  const [pop, setPop] = useState(false);

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved((s) => !s);
        setPop(true);
        setTimeout(() => setPop(false), 300);
      }}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow transition-all duration-300 hover:scale-110 active:scale-95 ${
        saved ? "text-rose-500" : "text-slate-500 hover:text-slate-700"
      } ${pop ? "scale-125" : ""}`}
    >
      <HeartIcon 
        className={`h-4 w-4 transition-transform ${pop ? "animate-pop-active" : ""}`} 
        filled={saved} 
      />
    </button>
  );
}
