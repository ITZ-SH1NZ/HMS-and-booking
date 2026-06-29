import { NextResponse } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { HOTELS_CACHE_TAG } from "@/lib/hotels";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Force purge the Next.js data cache for all hotels
    updateTag(HOTELS_CACHE_TAG);

    // Force purge the route caches
    revalidatePath("/", "layout");

    return NextResponse.json({
      ok: true,
      message: "Next.js cache successfully purged! All hotel details and reviews have been revalidated.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err),
    }, { status: 500 });
  }
}
