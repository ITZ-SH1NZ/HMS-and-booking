import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "@/components/BookingFlow";
import type { Room, Review, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    rooms?: string;
    roomId?: string;
  }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/hotels/${id}/book`);

  const [{ data: hotel }, { data: roomRows }, { data: reviewRows }, { data: profile }] =
    await Promise.all([
      supabase
        .from("hotels")
        .select("id, name, location, image_url, payment_policy, require_advance, advance_amount, advance_is_percent, gst_percent, service_charge_percent, cancellation_policy, cancellation_policy_custom")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id, name, price, capacity, amenities, room_photos(url)")
        .eq("hotel_id", id)
        .order("price", { ascending: true }),
      supabase.from("reviews").select("rating").eq("hotel_id", id),
      supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (!hotel) notFound();

  interface RoomDbRow {
    id: string;
    name: string;
    price: number;
    capacity: number;
    amenities: string[];
    room_photos?: { url: string }[];
  }

  const rooms = ((roomRows as unknown as RoomDbRow[] | null)?.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    capacity: r.capacity,
    amenities: r.amenities,
    image_url: r.room_photos?.[0]?.url ?? null,
  })) ?? []);
  const reviews = (reviewRows as Pick<Review, "rating">[] | null) ?? [];
  const prof = profile as Pick<Profile, "full_name" | "phone"> | null;

  const rating = reviews.length
     ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
     : null;

  return (
    <BookingFlow
      hotel={hotel}
      rooms={rooms}
      rating={rating}
      reviewCount={reviews.length}
      guest={{
        name: prof?.full_name ?? "",
        email: user.email ?? "",
        phone: prof?.phone ?? "",
      }}
      initialCheckIn={search.checkIn}
      initialCheckOut={search.checkOut}
      initialAdults={search.adults ? parseInt(search.adults) : undefined}
      initialChildren={search.children ? parseInt(search.children) : undefined}
      initialRooms={search.rooms ? parseInt(search.rooms) : undefined}
      initialRoomId={search.roomId}
    />
  );
}
