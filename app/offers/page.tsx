import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { toHotelCard } from "@/lib/hotels";
import { HotelCard } from "@/components/HotelCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import { Tag, Sparkles, Flame, Gift, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const OFFERS = [
  {
    id: "summer-30",
    title: "Early Summer Escape",
    tagline: "Up to 30% Off Luxury Stays",
    description: "Welcome the warm season with exclusive savings on our finest luxury getaways. Rest, recharge, and enjoy premium hospitality.",
    code: "SUMMER30",
    badge: "Limited Time",
    badgeColor: "bg-brand-700 text-white",
    icon: Flame,
    color: "bg-brand-950 text-white",
    btnColor: "bg-gold-500 hover:bg-gold-400 text-brand-950",
  },
  {
    id: "stay3-pay2",
    title: "Extended Weekend",
    tagline: "Stay 3 Nights, Pay for 2",
    description: "Make the weekend last longer. Book a three-night stay from Friday to Monday and get the third night completely free.",
    code: "WEEKEND3",
    badge: "Best Value",
    badgeColor: "bg-gold-500 text-brand-950",
    icon: Sparkles,
    color: "bg-white text-slate-900 border border-slate-200",
    btnColor: "bg-brand-700 hover:bg-brand-800 text-white",
  },
  {
    id: "last-minute-15",
    title: "Last-Minute Wanderlust",
    tagline: "15% Off Immediate Bookings",
    description: "Spontaneous travel plans? Book any stay starting within the next 48 hours and receive an instant 15% discount at checkout.",
    code: "LATE15",
    badge: "Spontaneous",
    badgeColor: "bg-amber-500 text-white",
    icon: Tag,
    color: "bg-[#F4F2EC] text-slate-900 border border-slate-200/40",
    btnColor: "bg-brand-700 hover:bg-brand-800 text-white",
  },
];

export default async function OffersPage() {
  const supabase = await createClient();
  const { data: hotelsData } = await supabase
    .from("hotels")
    .select("*, reviews(*), rooms(*)")
    .eq("status", "approved")
    .limit(4);

  const hotels = (hotelsData ?? []).map(toHotelCard);

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <ScrollReveal duration={0.6}>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
              BookNest Deals
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight font-serif sm:text-5xl">
              Exclusive Offers & <span className="font-serif italic font-medium text-brand-700">Deals</span>
            </h1>
            <p className="mt-3 text-base text-slate-500 font-medium">
              Handpicked promotions and seasonal packages designed to make your next getaway unforgettable.
            </p>
          </div>
        </ScrollReveal>

        {/* Offers Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {OFFERS.map((offer) => {
            const Icon = offer.icon;
            return (
              <StaggerItem key={offer.id}>
                <div className={`flex flex-col h-full rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-300 p-8 ${offer.color}`}>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${offer.badgeColor}`}>
                      {offer.badge}
                    </span>
                    <Icon className="h-6 w-6 opacity-80" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold font-serif leading-tight">{offer.title}</h3>
                    <p className="text-sm font-semibold text-gold-500 mt-1.5">{offer.tagline}</p>
                    <p className="mt-4 text-sm opacity-80 leading-relaxed font-medium">
                      {offer.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-current/10 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-current/5 rounded-xl px-4 py-2.5">
                      <span className="text-xs uppercase tracking-wider font-bold opacity-60">Promo Code</span>
                      <span className="font-mono font-bold text-sm tracking-widest">{offer.code}</span>
                    </div>
                    <Link
                      href="#participating"
                      className={`w-full py-3 rounded-xl text-center text-xs font-black transition cursor-pointer shadow-xs ${offer.btnColor}`}
                    >
                      View Stays
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Participating Stays */}
        <section id="participating" className="scroll-mt-24 pt-8">
          <ScrollReveal>
            <div className="mb-8 border-b border-slate-200/60 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                Participating Properties
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-bold">
                Apply these promo codes on your booking at any of these verified hotels.
              </p>
            </div>
          </ScrollReveal>

          {hotels.length === 0 ? (
            <p className="text-center py-12 text-slate-500 font-medium">No participating stays available at the moment.</p>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {hotels.map((hotel) => (
                <StaggerItem key={hotel.id}>
                  <HotelCard hotel={hotel} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>

      </div>
    </div>
  );
}
