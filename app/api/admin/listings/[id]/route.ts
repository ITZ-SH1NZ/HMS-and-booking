import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/authServer";
import { getPublicHotel } from "@/lib/hotels";

export const dynamic = "force-dynamic";

// Full listing preview for the moderation panel. getPublicHotel returns the
// complete detail for admins even when the hotel isn't approved yet.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, isAdmin } = await getAdminContext();
  if (!isAdmin || !userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const detail = await getPublicHotel(id, userId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}
