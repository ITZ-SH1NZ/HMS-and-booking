import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Price } from "@/components/Price";
import { BuildingIcon, MapPinIcon, StarIcon } from "@/components/icons";
import type { Hotel, Room, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

type HotelDetail = Hotel & { rooms: Room[]; reviews: Review[] };

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("hotels")
    .select("*, rooms(*), reviews(*)")
    .eq("id", id)
    .maybeSingle();

  const hotel = data as HotelDetail | null;
  if (!hotel) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ratings = hotel.reviews?.map((r) => r.rating) ?? [];
  const avg = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;
  const minPrice = hotel.rooms?.length
    ? Math.min(...hotel.rooms.map((r) => Number(r.price)))
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        {hotel.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.image_url}
            alt={hotel.name}
            className="h-72 w-full object-cover"
          />
        ) : (
          <div className="grid h-72 place-items-center text-slate-300">
            <BuildingIcon className="h-20 w-20" />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{hotel.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-slate-500">
            <MapPinIcon className="h-4 w-4 text-rose-500" /> {hotel.location}
          </p>
          {avg && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
              <StarIcon className="h-4 w-4 text-amber-400" filled /> {avg} ·{" "}
              {ratings.length} review{ratings.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="text-right">
          {minPrice !== null && (
            <p className="text-2xl font-bold text-slate-900">
              <Price amount={minPrice} />
              <span className="text-sm font-normal text-slate-500"> / night</span>
            </p>
          )}
          {user ? (
            <Link
              href={`/hotels/${hotel.id}/book`}
              className="mt-2 inline-block rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Book now
            </Link>
          ) : (
            <Link
              href={`/login?redirect=/hotels/${hotel.id}/book`}
              className="mt-2 inline-block rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Log in to book
            </Link>
          )}
        </div>
      </div>

      {hotel.description && (
        <p className="mt-6 leading-relaxed text-slate-700">{hotel.description}</p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Rooms</h2>
        {hotel.rooms?.length ? (
          <div className="space-y-2">
            {hotel.rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{room.name}</p>
                  <p className="text-sm text-slate-500">
                    Sleeps {room.capacity}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  <Price amount={Number(room.price)} />
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No rooms listed yet.</p>
        )}
      </section>
    </div>
  );
}
