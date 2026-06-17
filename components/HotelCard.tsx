import Link from "next/link";
import { Price } from "@/components/Price";
import { HeartButton } from "@/components/HeartButton";
import { BuildingIcon, StarIcon, MapPinIcon } from "@/components/icons";
import type { HotelCardData } from "@/lib/types";

export function HotelCard({ hotel }: { hotel: HotelCardData }) {
  return (
    <Link
      href={`/hotels/${hotel.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {hotel.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.image_url}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <BuildingIcon className="h-12 w-12" />
          </div>
        )}

        {hotel.rating !== null && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
            <StarIcon className="h-3.5 w-3.5 text-amber-400" filled />
            {hotel.rating.toFixed(1)}
          </span>
        )}

        <div className="absolute right-3 top-3">
          <HeartButton />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold text-slate-900">{hotel.name}</h3>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPinIcon className="h-4 w-4 text-rose-500" /> {hotel.location}
        </p>
        <div className="mt-auto pt-3">
          {hotel.minPrice !== null ? (
            <span className="text-sm">
              <Price
                amount={hotel.minPrice}
                className="text-base font-bold text-rose-600"
              />
              <span className="text-slate-500"> / night</span>
            </span>
          ) : (
            <span className="text-sm text-slate-400">Price on request</span>
          )}
        </div>
      </div>
    </Link>
  );
}
