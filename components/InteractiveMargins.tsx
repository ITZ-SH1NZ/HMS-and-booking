export function InteractiveMargins() {
  return (
    <>
      {/* Left Margin Line */}
      <div className="absolute left-[4%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#C5A880]/20 via-[#C5A880]/5 to-[#C5A880]/20 pointer-events-none hidden xl:block z-0" />

      {/* Right Margin Line */}
      <div className="absolute right-[4%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#C5A880]/20 via-[#C5A880]/5 to-[#C5A880]/20 pointer-events-none hidden xl:block z-0" />

      {/* Left Vertical Editorial Text */}
      <div className="absolute left-[2.2%] top-1/3 -translate-y-1/2 select-none pointer-events-none hidden xl:block z-0">
        <span className="text-[9px] text-[#C5A880]/40 uppercase tracking-[0.45em] font-black [writing-mode:vertical-lr] rotate-180">
          BookNest Stays &bull; Travel Journal
        </span>
      </div>

      {/* Right Vertical Editorial Text */}
      <div className="absolute right-[2.2%] top-1/3 -translate-y-1/2 select-none pointer-events-none hidden xl:block z-0">
        <span className="text-[9px] text-[#C5A880]/40 uppercase tracking-[0.45em] font-black [writing-mode:vertical-lr]">
          Lat 20.5937&deg; N &bull; Lon 78.9629&deg; E
        </span>
      </div>
    </>
  );
}
