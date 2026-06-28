import Link from "next/link";
import Image from "next/image";
import { HotelCard } from "@/components/HotelCard";
import { AirbnbSearch } from "@/components/AirbnbSearch";
import { Footer } from "@/components/Footer";
import { LandingPageLoader } from "@/components/LandingPageLoader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import { toHotelCard, getApprovedHotelsCached } from "@/lib/hotels";
import type { HotelCardData, HotelWithStats } from "@/lib/types";
import { getOptimizedImageUrl } from "@/lib/image";
import {
  AnimatedShieldCheck,
  AnimatedTag,
  AnimatedZap,
  AnimatedLock,
  AnimatedHeadphones,
} from "@/components/AnimatedIcons";
import { ArrowRight, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  location?: string;
  type?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
}

const CITY_IMAGES: Record<string, string> = {
  Goa: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&h=600&q=80",
  Kerala: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&h=600&q=80",
  Alleppey: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&h=600&q=80",
  Kochi: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&h=600&q=80",
  Ernakulam: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&h=600&q=80",
  Udaipur: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&h=600&q=80",
  Ladakh: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&h=600&q=80",
  Manali: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&h=600&q=80",
  Jaipur: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&h=600&q=80",
  Munambam: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&h=600&q=80",
  Mumbai: "https://images.unsplash.com/photo-1570168007244-df23658e183f?auto=format&fit=crop&w=600&h=600&q=80",
  Delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&h=600&q=80",
  Bangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&h=600&q=80",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { location, type } = await searchParams;

  // Read the catalog from cache
  let hotels: HotelCardData[] = [];
  let allApprovedHotels: HotelWithStats[] = [];
  let error = false;
  try {
    allApprovedHotels = await getApprovedHotelsCached();
    
    let matched = allApprovedHotels;
    
    const term = location?.trim().toLowerCase();
    if (term) {
      const words = term.replace(/[,()]/g, " ").split(/\s+/).filter(Boolean);
      matched = matched.filter((h) => {
        const target = `${h.name ?? ""} ${h.location ?? ""} ${h.city ?? ""} ${h.state ?? ""}`.toLowerCase();
        return words.every((word) => target.includes(word));
      });
    }
    
    if (type) {
      matched = matched.filter((h) =>
        h.property_type?.toLowerCase() === type.toLowerCase()
      );
    }
    
    hotels = matched.map(toHotelCard);
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

  // 1. Group hotels by city dynamically (Remove hardcoded stays count)
  const cityCounts: Record<string, number> = {};
  allApprovedHotels.forEach((h) => {
    const city = h.city || h.location?.split(",")[0];
    if (city) {
      const cityTitle = city.trim().replace(/\b\w/g, (c: string) => c.toUpperCase());
      cityCounts[cityTitle] = (cityCounts[cityTitle] || 0) + 1;
    }
  });

  // 2. Build destinations dynamically from cities in DB
  const destinationsList = Object.entries(cityCounts).map(([name, count]) => {
    return {
      name,
      stays: `${count} ${count === 1 ? "stay" : "stays"}`,
      image: CITY_IMAGES[name] || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&h=600&q=80",
    };
  });

  // 3. Supplement with popular destinations if list is short (less than 6) to keep visual balance
  const normalizedDrafts = ["Goa", "Kerala", "Ladakh", "Udaipur", "Manali", "Jaipur"];
  normalizedDrafts.forEach((name) => {
    if (destinationsList.length < 6 && !cityCounts[name]) {
      destinationsList.push({
        name,
        stays: "Explore stays",
        image: CITY_IMAGES[name] || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&h=600&q=80",
      });
    }
  });

  return (
    <div className="relative flex flex-col min-h-screen bg-[#F8F7F4] overflow-hidden">
      <LandingPageLoader />

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
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl h-[460px] md:h-[550px] bg-slate-900 shadow-xl">
            {/* Sunset beach pool cover background - fully colored */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-103"
              style={{
                backgroundImage:
                  `url('${getOptimizedImageUrl("https://images.unsplash.com/photo-1571896349842-33c89424de2d", 1200, 80)}')`,
              }}
            />
            {/* Left vignette gradient for high text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent" />
            
            <div className="relative h-full px-6 py-16 sm:px-12 flex flex-col justify-center max-w-2xl text-white select-none">
              <span className="text-xs font-black uppercase tracking-widest text-gold-400 mb-2.5">
                Introducing BookNest
              </span>
              <h1 className="text-4xl font-extrabold sm:text-6xl tracking-tight leading-tight font-serif">
                Find your <span className="font-serif italic font-medium text-gold-400">perfect stay</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-100/90 leading-relaxed font-semibold">
                Handpicked stays across India and beyond.
              </p>
              <p className="text-xs text-slate-300 font-black uppercase tracking-wider mt-1.5 font-sans">
                Best prices. Trusted properties. Seamless booking.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Floating Search Bar */}
        <div className="relative z-20 mx-auto -mt-10 flex max-w-3xl justify-center px-4">
          <ScrollReveal delay={0.15} duration={0.6}>
            <AirbnbSearch />
          </ScrollReveal>
        </div>
      </section>

      {/* Recommended/Featured Stays */}
      <section id="hotels" className="relative z-10 mx-auto max-w-7xl w-full px-4 py-8 scroll-mt-20">
        <ScrollReveal>
          <div className="mb-8 flex items-baseline justify-between border-b border-slate-200/60 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                {location ? `Stays in “${location}”` : "Featured stays"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-bold">
                {location
                  ? `Showing available properties in ${location}`
                  : "Curated stays we think you'll love"}
              </p>
            </div>
            {location ? (
              <span className="text-sm font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                {hotels.length} {hotels.length === 1 ? "stay" : "stays"} found
              </span>
            ) : (
              <Link
                href="#hotels"
                className="text-sm font-black text-brand-700 hover:text-brand-600 transition flex items-center gap-1 group"
              >
                View all properties
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </ScrollReveal>

        {error ? (
          <EmptyState
            title="Couldn't load hotels"
            body="Check that your Supabase keys are set and the schema has been applied."
          />
        ) : hotels.length === 0 ? (
          <EmptyState
            title="No hotels found"
            body={
              location
                ? "Try a different search term, or clear the search to view all stays."
                : "Once managers publish and approve hotels, they'll show up here."
            }
          />
        ) : (
          <div className="relative group/grid">
            <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {hotels.map((hotel) => (
                <StaggerItem key={hotel.id}>
                  <HotelCard hotel={hotel} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            {/* Slider Next Arrow */}
            <button 
              type="button"
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden xl:grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-700 hover:shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Next featured stays"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </section>

      {/* Promo Banner Trio - Split Layout */}
      <section className="relative z-10 mx-auto max-w-7xl w-full px-4 py-12">
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
            <div className="relative w-[38%] aspect-square rounded-2xl overflow-hidden shrink-0 shadow-sm">
              <Image
                src={getOptimizedImageUrl(cheapestHotel?.image_url || "https://images.unsplash.com/photo-1540553016722-983e48a2cd10", 400, 80)}
                alt="Cheapest stay cover"
                fill
                sizes="150px"
                className="object-cover transition duration-500 group-hover:scale-105"
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
            <div className="relative w-[38%] aspect-square rounded-2xl overflow-hidden shrink-0 shadow-sm">
              <Image
                src={getOptimizedImageUrl(topRatedHotel?.image_url || "https://images.unsplash.com/photo-1497366216548-37526070297c", 400, 80)}
                alt="Top rated stay cover"
                fill
                sizes="150px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
          </StaggerItem>

          {/* Card 3: Member Exclusive */}
          <StaggerItem className="flex rounded-3xl overflow-hidden bg-brand-900 p-7 justify-between items-center shadow-xs min-h-[170px] hover:shadow-md transition duration-300 group relative">
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
            <div className="relative w-[38%] flex justify-center items-center shrink-0">
              <div className="w-24 h-36 rounded-xl bg-brand-950 border border-gold-500/35 flex flex-col justify-between p-3 rotate-6 shadow-xl transition-transform duration-500 group-hover:rotate-3 select-none">
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

      {/* Popular Destinations */}
      <section className="relative z-10 mx-auto max-w-7xl w-full px-4 py-12 border-t border-slate-200/60">
        <ScrollReveal>
          <div className="mb-8 flex items-baseline justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">Popular destinations</h2>
              <p className="mt-1 text-sm text-slate-500 font-bold">
                Explore stays in India&apos;s most popular travel getaways.
              </p>
            </div>
            <Link
              href="/hotels"
              className="text-sm font-black text-brand-700 hover:text-brand-600 transition flex items-center gap-1 group"
            >
              Explore all destinations
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </ScrollReveal>
        
        <div className="relative">
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {destinationsList.map((dest) => (
              <StaggerItem key={dest.name}>
                <Link
                  href={`/?location=${dest.name}#hotels`}
                  className="relative group flex flex-col rounded-2xl overflow-hidden aspect-[4/5] bg-slate-900 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <Image
                    src={getOptimizedImageUrl(dest.image, 300, 80)}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 180px"
                    className="object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 z-10">
                    <p className="font-bold text-white leading-tight text-base sm:text-lg font-serif">{dest.name}</p>
                    <p className="text-xs text-gold-300 font-bold mt-0.5">{dest.stays}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Slider Arrow overlay */}
          <button 
            type="button"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden xl:grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-700 hover:shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Next destinations"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Trust Section - Why book with BookNest */}
      <section className="relative z-10 mx-auto max-w-7xl w-full px-4 py-12">
        <ScrollReveal>
          <div className="border border-slate-200/80 rounded-3xl bg-white/60 backdrop-blur-md p-8 sm:p-12 shadow-xs">
            <h2 className="text-2xl font-black text-center text-brand-850 tracking-tight mb-10 font-serif">
              Why book with <span className="font-serif italic font-medium">BookNest</span>?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Point 1 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4 shadow-xs transition duration-300 group-hover:bg-brand-100">
                  <AnimatedShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Verified properties</h4>
                <p className="mt-2 text-xs text-slate-500 font-bold">Quality stays you can trust</p>
              </div>

              {/* Point 2 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4 shadow-xs transition duration-300 group-hover:bg-brand-100">
                  <AnimatedTag className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Best price guarantee</h4>
                <p className="mt-2 text-xs text-slate-500 font-bold">Find a lower price? We&apos;ll match it</p>
              </div>

              {/* Point 3 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4 shadow-xs transition duration-300 group-hover:bg-brand-100">
                  <AnimatedZap className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Instant confirmation</h4>
                <p className="mt-2 text-xs text-slate-500 font-bold">Book instantly, stress-free</p>
              </div>

              {/* Point 4 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4 shadow-xs transition duration-300 group-hover:bg-brand-100">
                  <AnimatedLock className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Secure payments</h4>
                <p className="mt-2 text-xs text-slate-500 font-bold">100% safe & encrypted</p>
              </div>

              {/* Point 5 */}
              <div className="flex flex-col items-center text-center group cursor-pointer sm:col-span-2 lg:col-span-1">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4 shadow-xs transition duration-300 group-hover:bg-brand-100">
                  <AnimatedHeadphones className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">24/7 support</h4>
                <p className="mt-2 text-xs text-slate-500 font-bold">We&apos;re here for you anytime</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Newsletter Signup Banner */}
      <section className="relative z-10 mx-auto max-w-7xl w-full px-4 py-8">
        <ScrollReveal>
          <div className="rounded-3xl bg-brand-900 text-white p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 group relative overflow-hidden">
            {/* Subtle decorative vector rings */}
            <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full border border-brand-850 opacity-20" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full border border-brand-850 opacity-10" />

            {/* Left Text and Mail Graphic */}
            <div className="flex items-center gap-5 z-10">
              <div className="hidden sm:grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold-400 border border-white/10 shadow-inner group-hover:-translate-y-1 transition-transform duration-500 select-none">
                <svg className="h-7 w-7 animate-hover-float" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-serif">
                  Get exclusive deals & <span className="font-serif italic font-medium text-gold-400">travel inspiration</span>
                </h3>
                <p className="mt-1 text-sm text-brand-200/90 font-medium font-sans">
                  Subscribe to our newsletter and never miss a good deal.
                </p>
              </div>
            </div>

            {/* Right Input and Button */}
            <form className="flex w-full md:w-auto items-center bg-white rounded-full p-1.5 shadow-sm max-w-md z-10">
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="bg-transparent text-sm text-slate-800 outline-none px-4 py-2 w-full md:w-60 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="bg-gold-500 text-brand-950 hover:bg-gold-400 active:scale-95 text-sm font-black px-6 py-2.5 rounded-full transition shadow-xs cursor-pointer shrink-0"
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 px-6 text-center max-w-xl mx-auto w-full my-8 shadow-xs">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500 max-w-sm font-medium">{body}</p>
    </div>
  );
}
