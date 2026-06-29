"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 35, stiffness: 380, mass: 0.6 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Disable custom cursor on touch/mobile devices
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);

    const moveCursor = (e: MouseEvent) => {
      // Offset by half of ring width (w-7 = 28px)
      cursorX.set(e.clientX - 14);
      cursorY.set(e.clientY - 14);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") !== null ||
        target.closest("button") !== null ||
        target.getAttribute("role") === "button" ||
        target.classList.contains("cursor-pointer");

      setIsHovered(!!isClickable);
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);

    // Inject global styles to hide default cursor on desktop
    const style = document.createElement("style");
    style.innerHTML = `
      @media (min-width: 1024px) {
        body, a, button, [role="button"], .cursor-pointer {
          cursor: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
      document.head.removeChild(style);
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer Lag-Smoothed Champagne Ring */}
      <motion.div
        className="fixed top-0 left-0 w-7 h-7 rounded-full border pointer-events-none z-50 mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          scale: isHovered ? 1.4 : 1,
          backgroundColor: isHovered ? "rgba(197, 168, 128, 0.08)" : "rgba(197, 168, 128, 0)",
          borderColor: isHovered ? "#C5A880" : "rgba(197, 168, 128, 0.4)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      {/* Inner Fast Gold Dot */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-[#C5A880] pointer-events-none z-50 mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: 11.25, // Center inside the 28px outer ring
          translateY: 11.25,
          scale: isHovered ? 0.5 : 1,
        }}
      />
    </>
  );
}
