"use client";

import { useEffect, useState } from "react";

/**
 * Watches a list of section IDs and returns which one is currently
 * most in view. Uses IntersectionObserver with a rootMargin that
 * accounts for the sticky navbar + tab bar.
 */
export function useScrollspy(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry most in view (highest intersection ratio)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Offset to account for sticky navbar (~64px) + tab bar (~48px)
        rootMargin: "-120px 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    const elements: Element[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    }

    return () => {
      for (const el of elements) observer.unobserve(el);
    };
  }, [sectionIds]);

  return activeId;
}
