import { Suspense } from "react";
import { getApprovedHotelsCached } from "@/lib/hotels";
import HotelsClient from "./HotelsClient";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  let hotels: any[] = [];
  try {
    hotels = await getApprovedHotelsCached();
  } catch (error: any) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream-50 text-slate-800">
        <div className="text-center">
          <h2 className="text-xl font-bold">Error loading stays</h2>
          <p className="text-sm text-slate-500 mt-2">{error.message || "Please check database connection."}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-cream-50 text-slate-400 font-semibold animate-pulse">
          Loading Explore Stays...
        </div>
      }
    >
      <HotelsClient hotels={hotels} />
    </Suspense>
  );
}