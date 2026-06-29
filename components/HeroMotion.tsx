"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function HeroMotion() {
  useEffect(() => {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Use gsap.context() for clean, leak-free React lifecycle management
    const ctx = gsap.context(() => {
      // 1. Hero Background Parallax Scroll
      gsap.to("#hero-bg", {
        yPercent: 15, // Smooth translation within the 120% height bounds
        ease: "none",
        scrollTrigger: {
          trigger: "#hero-bg-container",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // 2. Split-Line Stagger Reveal
      gsap.fromTo(
        ".hero-title-line",
        { y: "115%", opacity: 0 },
        {
          y: "0%",
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.2,
        }
      );
    });

    // Revert all GSAP animations/ScrollTriggers created in this context on unmount
    return () => ctx.revert();
  }, []);

  return null;
}
