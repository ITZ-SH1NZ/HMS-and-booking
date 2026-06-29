import { Suspense } from "react";
import Link from "next/link";
import { AirbnbSearch } from "@/components/AirbnbSearch";
import { Footer } from "@/components/Footer";
import { LandingPageLoader } from "@/components/LandingPageLoader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import { toHotelCard, getApprovedHotelsCached } from "@/lib/hotels";
import type { HotelWithStats } from "@/lib/types";
import { getOptimizedImageUrl } from "@/lib/image";
import { HomeStays, type HomeStay } from "@/components/HomeStays";
import { AutoRefresh } from "@/components/AutoRefresh";
import {
  AnimatedShieldCheck,
  AnimatedTag,
  AnimatedZap,
  AnimatedLock,
  AnimatedHeadphones,
} from "@/components/AnimatedIcons";
import { ArrowRight } from "lucide-react";
import DestinationsMapWrapper from "@/components/DestinationsMapWrapper";
import { InteractiveMargins } from "@/components/InteractiveMargins";
import { HeroMotion } from "@/components/HeroMotion";

// ISR: the catalog is cookie-free + cached and all filtering now happens
// client-side in <HomeStays>, so this page is statically rendered and served
// from the CDN, regenerating at most once a minute.
export const revalidate = 60;

export default async function HomePage() {
  // Read the full catalog from cache. The ?location/?type search is applied in
  // the browser by <HomeStays>, keeping this render param-independent (static).
  let allHotels: HomeStay[] = [];
  let allApprovedHotels: HotelWithStats[] = [];
  let error = false;
  try {
    allApprovedHotels = await getApprovedHotelsCached();
    allHotels = allApprovedHotels.map((h) => ({
      ...toHotelCard(h),
      city: h.city ?? null,
      state: h.state ?? null,
      property_type: h.property_type ?? null,
    }));
  } catch {
    error = true;
  }

  // Find cheapest hotel dynamically from allApprovedHotels
  let cheapestHotel: HotelWithStats | null = null;
  let cheapestPrice: number | null = null;
  const hotelsWithRooms = allApprovedHotels.filter(
    (h) => h.rooms && h.rooms.length > 0
  );
  if (hotelsWithRooms.length > 0) {
    cheapestHotel = hotelsWithRooms.reduce((prev, curr) => {
      const prevMin = Math.min(...prev.rooms.map((r) => r.price));
      const currMin = Math.min(...curr.rooms.map((r) => r.price));
      return currMin < prevMin ? curr : prev;
    });
    cheapestPrice = Math.min(...cheapestHotel.rooms.map((r) => r.price));
  }

  // Find top-rated hotel dynamically from allApprovedHotels
  let topRatedHotel: HotelWithStats | null = null;
  let topRatedAvg: number | null = null;
  const hotelsWithReviews = allApprovedHotels.filter(
    (h) => h.reviews && h.reviews.length > 0
  );
  if (hotelsWithReviews.length > 0) {
    topRatedHotel = hotelsWithReviews.reduce((prev, curr) => {
      const prevAvg = prev.reviews.reduce((s, r) => s + r.rating, 0) / prev.reviews.length;
      const currAvg = curr.reviews.reduce((s, r) => s + r.rating, 0) / curr.reviews.length;
      return currAvg > prevAvg ? curr : prev;
    });
    topRatedAvg = topRatedHotel.reviews.reduce((s, r) => s + r.rating, 0) / topRatedHotel.reviews.length;
  }

  // 1. Group hotels by city dynamically and calculate average coordinates
  const cityData: Record<string, { count: number; latSum: number; lngSum: number; coordCount: number }> = {};
  allApprovedHotels.forEach((h) => {
    const city = h.city || h.location?.split(",")[0];
    if (city) {
      const cityTitle = city.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (!cityData[cityTitle]) {
        cityData[cityTitle] = { count: 0, latSum: 0, lngSum: 0, coordCount: 0 };
      }
      cityData[cityTitle].count += 1;
      if (h.latitude && h.longitude && !isNaN(Number(h.latitude)) && !isNaN(Number(h.longitude))) {
        cityData[cityTitle].latSum += Number(h.latitude);
        cityData[cityTitle].lngSum += Number(h.longitude);
        cityData[cityTitle].coordCount += 1;
      }
    }
  });

  // 2. Build destinations dynamically from cities in DB
  const destinationsList = Object.entries(cityData).map(([name, data]) => {
    const avgLat = data.coordCount > 0 ? data.latSum / data.coordCount : null;
    const avgLng = data.coordCount > 0 ? data.lngSum / data.coordCount : null;
    return {
      name,
      stays: `${data.count} ${data.count === 1 ? "stay" : "stays"}`,
      count: data.count,
      latitude: avgLat,
      longitude: avgLng,
    };
  });

  return (
    <div
      className="relative flex flex-col min-h-screen bg-[#F8F7F4] overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(rgba(197, 168, 128, 0.12) 1.5px, transparent 1.5px)",
        backgroundSize: "40px 40px",
      }}
    >
      <AutoRefresh />
      <LandingPageLoader />

      {/* Interactive Editorial Margins & Scroll Tracker */}
      <InteractiveMargins />

      {/* Background Layer: Faint Organic Leaves */}
      <FaintLeaf className="left-4 top-20 w-36 h-36 rotate-12 animate-leaf-float-1" />
      <FaintLeaf className="right-12 top-48 w-48 h-48 -rotate-45 animate-leaf-float-2" />
      <FaintLeaf className="left-8 top-[900px] w-52 h-52 rotate-45 animate-leaf-float-1" />
      <FaintLeaf className="right-6 top-[1500px] w-40 h-40 -rotate-12 animate-leaf-float-2" />
      <FaintLeaf className="left-16 top-[2200px] w-56 h-56 rotate-90 animate-leaf-float-1" />
      <FaintLeaf className="right-10 top-[2800px] w-44 h-44 -rotate-90 animate-leaf-float-2" />

      {/* Hero Coversunset Section — Elevated Z-Index to Z-30 to prevent Calendar popover clipping */}
      <section className="px-4 pt-6 relative z-30">
        <ScrollReveal duration={0.65}>
          <div id="hero-bg-container" className="relative mx-auto max-w-[1600px] overflow-hidden rounded-3xl h-[460px] md:h-[550px] bg-slate-900 shadow-xl">
            {/* Sunset beach pool cover background - taller for parallax translation */}
            <div
              id="hero-bg"
              className="absolute -top-[10%] left-0 w-full h-[120%] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1800&q=80')",
              }}
            />
            {/* Dark Cinematic Vignette Overlay + Matte Tint for 100% text readability */}
            <div className="absolute inset-0 bg-slate-950/45 z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-slate-950/40 z-0" />

            {/* GSAP Motion Controller */}
            <HeroMotion />

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#C5A880] drop-shadow-xs">
                BookNest Luxury Collection
              </span>
              <h1 className="max-w-3xl font-serif text-3xl font-light tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md leading-tight">
                <span className="block overflow-hidden py-1">
                  <span className="inline-block hero-title-line">Find stays that</span>
                </span>
                <span className="block overflow-hidden py-1">
                  <span className="inline-block hero-title-line font-serif italic text-[#C5A880]">feel like home</span>
                </span>
              </h1>
            </div>
          </div>
        </ScrollReveal>

        {/* Floating Search Bar with Gold shadow */}
        <div className="relative z-20 mx-auto -mt-10 flex max-w-3xl justify-center px-4 drop-shadow-[0_15px_30px_rgba(197,168,128,0.08)]">
          <ScrollReveal delay={0.15} duration={0.6}>
            <AirbnbSearch />
          </ScrollReveal>
        </div>
      </section>

      {/* Recommended/Featured Stays */}
      <Suspense
        fallback={
          <div className="relative z-10 mx-auto max-w-[1600px] w-full px-4 py-8 min-h-[520px]" />
        }
      >
        <HomeStays allHotels={allHotels} error={error} />
      </Suspense>

      {/* Delicate Gold Divider */}
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/30 to-transparent" />
      </div>

      {/* Promo Banner Trio - Split Layout */}
      <section className="relative z-10 mx-auto max-w-[1600px] w-full px-4 py-20">
        <StaggerContainer className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Card 1: Up to 30% Off */}
          <StaggerItem className="flex rounded-3xl overflow-hidden bg-[#F4F2EC] border border-slate-200/40 p-7 justify-between items-center shadow-xs min-h-[170px] hover:shadow-md transition duration-300 group">
            <div className="flex flex-col gap-1.5 max-w-[55%]">
              <span className="text-[10px] font-black tracking-widest text-brand-700 uppercase">
                {cheapestHotel ? `From ₹${cheapestPrice}/night` : "Up to 30% off"}
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight font-serif">
                {cheapestHotel ? `Escape to ${cheapestHotel.name}` : "Early summer escapes"}
              </h3>
              <Link
                href={cheapestHotel ? `/hotels/${cheapestHotel.id}` : "#hotels"}
                className="inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-800 transition duration-200 mt-2"
              >
                Book now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="relative w-[38%] aspect-square rounded-2xl overflow-hidden shrink-0 shadow-sm opacity-90">
              <img
                src={cheapestHotel?.image_url || "https://images.unsplash.com/photo-1540553016722-983e48a2cd10"}
                alt="Cheapest stay cover"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105 rounded-2xl"
              />
            </div>
          </StaggerItem>

          {/* Card 2: Business Travel */}
          <StaggerItem className="flex rounded-3xl overflow-hidden bg-[#F4F2EC] border border-slate-200/40 p-7 justify-between items-center shadow-xs min-h-[170px] hover:shadow-md transition duration-300 group">
            <div className="flex flex-col gap-1.5 max-w-[55%]">
              <span className="text-[10px] font-black tracking-widest text-brand-700 uppercase flex items-center">
                {topRatedHotel ? (
                  <span className="inline-flex items-center gap-0.5">
                    Top Rated — {Number(topRatedAvg).toFixed(1)}
                    <svg className="h-3 w-3 text-gold-600 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </span>
                ) : (
                  "Business travel"
                )}
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight font-serif">
                {topRatedHotel ? `Premium stay at ${topRatedHotel.name}` : "Comfort for every journey"}
              </h3>
              <Link
                href="/business-travel"
                className="inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-800 transition duration-200 mt-2"
              >
                Explore stays
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="relative w-[38%] aspect-square rounded-2xl overflow-hidden shrink-0 shadow-sm opacity-90">
              <img
                src={topRatedHotel?.image_url || "https://images.unsplash.com/photo-1497366216548-37526070297c"}
                alt="Top rated stay cover"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105 rounded-2xl"
              />
            </div>
          </StaggerItem>

          {/* Card 3: Member Exclusive (Luxury Gold Foil Effect) */}
          <StaggerItem className="flex rounded-3xl overflow-hidden bg-[#0E3829] p-7 justify-between items-center shadow-xs min-h-[170px] hover:shadow-md transition duration-300 group relative">
            {/* Gold foil shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0E3829] via-[#0E3829] to-[#124b37] opacity-100 transition-all duration-500 group-hover:opacity-95 z-0" />
            <div className="absolute -inset-y-20 -inset-x-40 w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent rotate-45 -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-out pointer-events-none z-0" />
            
            <div className="flex flex-col gap-1.5 max-w-[55%] text-white z-10">
              <span className="text-[10px] font-black tracking-widest text-gold-400 uppercase">
                Member exclusive
              </span>
              <h3 className="text-lg font-black leading-tight text-white font-serif italic">Extra 10% off</h3>
              <Link
                href="/gift-cards"
                className="inline-flex items-center gap-1 text-xs font-black text-gold-400 hover:text-gold-300 transition duration-200 mt-2"
              >
                Explore benefits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            
            {/* Rotated Rewards card */}
            <div className="relative w-[38%] flex justify-center items-center shrink-0 z-10">
              <div className="w-24 h-36 rounded-xl bg-[#081F16] border border-gold-500/35 flex flex-col justify-between p-3 rotate-6 shadow-xl transition-transform duration-500 group-hover:rotate-3 select-none">
                <span className="text-[7px] font-black text-brand-400 tracking-widest uppercase">Rewards</span>
                <div className="my-auto flex justify-center text-gold-500">
                  <svg className="h-7 w-7 animate-hover-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gold-400 tracking-wide font-serif">BookNest</span>
                  <span className="text-[5px] font-medium text-slate-500 mt-0.5">EXCLUSIVE</span>
                </div>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* Map Section */}
      <ScrollReveal>
        <DestinationsMapWrapper destinations={destinationsList} />
      </ScrollReveal>

      {/* Delicate Gold Divider */}
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/30 to-transparent" />
      </div>

      {/* Trust Section - Why book with BookNest */}
      <section className="relative z-10 mx-auto max-w-5xl w-full px-4 py-20">
        <ScrollReveal>
          <div className="border border-[#E7E2D8]/80 rounded-3xl bg-[#FAF8F5]/60 backdrop-blur-md p-8 sm:p-12 shadow-xs">
            <h2 className="text-2xl font-black text-center text-[#0E3829] tracking-tight mb-12 font-serif">
              Why book with <span className="font-serif italic font-medium">BookNest</span>?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Point 1 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-[#C5A880]/35 text-[#0E3829] mb-4 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0E3829] group-hover:text-[#C5A880] group-hover:border-transparent group-hover:shadow-md">
                  <AnimatedShieldCheck className="h-5.5 w-5.5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">Verified properties</h4>
                <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">Quality stays you can trust</p>
              </div>

              {/* Point 2 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-[#C5A880]/35 text-[#0E3829] mb-4 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0E3829] group-hover:text-[#C5A880] group-hover:border-transparent group-hover:shadow-md">
                  <AnimatedTag className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">Best price guarantee</h4>
                <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">Find a lower price? We&apos;ll match it</p>
              </div>

              {/* Point 3 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-[#C5A880]/35 text-[#0E3829] mb-4 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0E3829] group-hover:text-[#C5A880] group-hover:border-transparent group-hover:shadow-md">
                  <AnimatedZap className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">Instant confirmation</h4>
                <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">Book instantly, stress-free</p>
              </div>

              {/* Point 4 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-[#C5A880]/35 text-[#0E3829] mb-4 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0E3829] group-hover:text-[#C5A880] group-hover:border-transparent group-hover:shadow-md">
                  <AnimatedLock className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">Secure payments</h4>
                <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">100% safe & encrypted</p>
              </div>

              {/* Point 5 */}
              <div className="flex flex-col items-center text-center group cursor-pointer sm:col-span-2 lg:col-span-1">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-[#C5A880]/35 text-[#0E3829] mb-4 shadow-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0E3829] group-hover:text-[#C5A880] group-hover:border-transparent group-hover:shadow-md">
                  <AnimatedHeadphones className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">24/7 support</h4>
                <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">We&apos;re here for you anytime</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Delicate Gold Divider */}
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/30 to-transparent" />
      </div>

      {/* Newsletter Signup Banner */}
      <section className="relative z-10 mx-auto max-w-5xl w-full px-4 py-16">
        <ScrollReveal>
          <div className="rounded-3xl bg-[#FAF8F5] p-8 md:p-12 shadow-md flex flex-col md:flex-row items-center justify-between gap-8 group relative overflow-hidden border border-[#C5A880]/30">
            {/* Subtle decorative gold-accented vector rings */}
            <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full border border-[#C5A880]/5 opacity-30" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full border border-[#C5A880]/5 opacity-15" />

            {/* Left Text and Mail Graphic */}
            <div className="flex items-center gap-5 z-10">
              <div className="hidden sm:grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white border border-[#C5A880]/20 text-[#0E3829] shadow-sm group-hover:-translate-y-1 transition-transform duration-500 select-none animate-hover-float">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl sm:text-2xl font-black text-[#0E3829] tracking-tight font-serif">
                  Get exclusive deals & <span className="font-serif italic font-medium text-gold-600">travel inspiration</span>
                </h3>
                <p className="mt-1 text-sm text-slate-500 font-medium font-sans">
                  Subscribe to our newsletter and never miss a good deal.
                </p>
              </div>
            </div>

            {/* Right Input and Button */}
            <form className="flex w-full md:w-auto items-center bg-white border border-[#C5A880]/35 rounded-2xl p-1.5 shadow-xs max-w-md z-10">
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="bg-transparent text-sm text-slate-800 outline-none px-4 py-2 w-full md:w-60 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="bg-[#0E3829] text-white hover:bg-brand-850 active:scale-95 text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm cursor-pointer shrink-0"
              >
                Subscribe
              </button>
            </form>
          </div>
        </ScrollReveal>
      </section>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

function FaintLeaf({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none select-none absolute text-brand-700/4 fill-current z-0 ${className}`}
    >
      <path d="M17 8C8 10 4 19 4 19S13 15 16 8C17 5.6 15.6 3 12 3C8.4 3 6.6 6 6.6 6S8.4 9 12 9C15.6 9 17 8 17 8Z" />
    </svg>
  );
}

