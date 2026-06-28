import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { toHotelCard } from "@/lib/hotels";
import { HotelCard } from "@/components/HotelCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ScrollReveal";
import { Briefcase, Wifi, Shield, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const ADVANTAGES = [
  {
    title: "High-Speed Connectivity",
    description: "Every business-tier stay features complimentary enterprise-grade high-speed Wi-Fi, keeping you connected to your team and clients without interruption.",
    icon: Wifi,
  },
  {
    title: "Dedicated Workspaces",
    description: "Rooms are equipped with ergonomic desks, comfortable chairs, and ample power outlets to serve as your private, productive remote office.",
    icon: Briefcase,
  },
  {
    title: "Corporate Amenities",
    description: "Access fully-equipped business centers, conference rooms, meeting spaces, and printing/fax facilities directly inside the properties.",
    icon: CreditCard,
  },
  {
    title: "Seamless Billing & GST",
    description: "Get instant corporate tax invoices with GST details, automated expense logging, and flexible payment options for hassle-free reimbursement.",
    icon: Shield,
  },
];

export default async function BusinessTravelPage() {
  const supabase = await createClient();
  const { data: hotelsData } = await supabase
    .from("hotels")
    .select("*, reviews(*), rooms(*)")
    .eq("status", "approved");

  // Filter hotels that contain business amenities
  const businessHotels = (hotelsData ?? [])
    .filter((h) => {
      // Check if amenities array contains business-related items
      const amenities = Array.isArray(h.amenities) 
        ? h.amenities 
        : typeof h.amenities === "string" 
          ? (h.amenities as string).replace(/[{}]/g, "").split(",")
          : [];
      const lower = amenities.map((a: string) => a.trim().toLowerCase());
      return lower.some((a: string) => 
        a.includes("business") || 
        a.includes("conference") || 
        a.includes("wifi") || 
        a.includes("gym") ||
        a.includes("desk")
      );
    })
    .slice(0, 4)
    .map(toHotelCard);

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <section className="mb-16">
          <ScrollReveal duration={0.65}>
            <div className="relative rounded-3xl overflow-hidden bg-brand-950 text-white shadow-xl min-h-[400px] flex items-center p-8 md:p-16">
              {/* Overlay background pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
              <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-800/10 blur-3xl" />
              
              <div className="relative max-w-2xl z-10">
                <span className="text-xs font-black uppercase tracking-widest text-gold-400">
                  BookNest for Business
                </span>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight font-serif sm:text-5xl leading-tight">
                  Elevating the <span className="font-serif italic font-medium text-gold-400">business travel</span> experience
                </h1>
                <p className="mt-6 text-base text-slate-200/90 leading-relaxed font-medium">
                  We combine the comfort of home with the amenities of a premium office. Discover handpicked stays across India tailored for corporate travelers and remote professionals.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="#stays"
                    className="bg-gold-500 hover:bg-gold-400 text-brand-950 px-6 py-3 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                  >
                    Browse Business Stays
                  </Link>
                  <Link
                    href="/signup?role=manager"
                    className="border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    List Your Business Hotel
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Benefits Grid */}
        <section className="mb-20">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-serif">
                Designed for Productivity & Comfort
              </h2>
              <p className="mt-2 text-sm text-slate-500 font-bold">
                Everything you need to stay productive, healthy, and relaxed on your next work trip.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {ADVANTAGES.map((adv) => {
              const Icon = adv.icon;
              return (
                <StaggerItem key={adv.title}>
                  <div className="bg-white border border-slate-200/65 p-6 rounded-2xl h-full shadow-xs hover:shadow-md transition duration-300">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700 mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{adv.title}</h3>
                    <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">
                      {adv.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>

        {/* Custom business hotels */}
        <section id="stays" className="scroll-mt-24">
          <ScrollReveal>
            <div className="mb-8 border-b border-slate-200/60 pb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                  Top-Rated Business Stays
                </h2>
                <p className="mt-1 text-sm text-slate-500 font-bold">
                  Verified properties offering high-speed WiFi, conference rooms, and business lounges.
                </p>
              </div>
              <span className="hidden sm:inline text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                Work-friendly Spaces
              </span>
            </div>
          </ScrollReveal>

          {businessHotels.length === 0 ? (
            <p className="text-center py-12 text-slate-500 font-medium">No business-tier stays found. Check back soon!</p>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {businessHotels.map((hotel) => (
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
