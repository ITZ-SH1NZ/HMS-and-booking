import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "@/components/BookingFlow";
import type { Room, Review, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/hotels/${id}/book`);

  const [{ data: hotel }, { data: roomRows }, { data: reviewRows }, { data: profile }] =
    await Promise.all([
      supabase
        .from("hotels")
        .select("id, name, location, image_url")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id, name, price, capacity, amenities")
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

  const rooms = (roomRows as Pick<Room, "id" | "name" | "price" | "capacity" | "amenities">[] | null) ?? [];
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
    />
  );
}
