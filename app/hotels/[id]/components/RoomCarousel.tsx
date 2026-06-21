"use client";

import Link from "next/link";
import Image from "next/image";
import {
  UsersIcon,
  BedIcon,
  CameraIcon,
} from "@/components/icons";
import { Price } from "@/components/Price";
import type { RoomWithPhotos } from "@/lib/types";
import { Section } from "./SectionWrapper";

interface RoomCarouselProps {
  rooms: RoomWithPhotos[];
  hotelId: string;
}

export function RoomCarousel({ rooms, hotelId }: RoomCarouselProps) {
  const activeRooms = rooms.filter((r) => r.is_active !== false);

  if (activeRooms.length === 0) {
    return (
      <Section id="rooms" title="Rooms & rates">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-400">Room information not yet available.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section id="rooms" title="Rooms & rates">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {activeRooms.map((room) => (
          <RoomCard key={room.id} room={room} hotelId={hotelId} />
        ))}
      </div>
    </Section>
  );
}

function RoomCard({ room, hotelId }: { room: RoomWithPhotos; hotelId: string }) {
  const coverPhoto = room.room_photos?.[0];
  const amenities =
    typeof room.amenities === "string"
      ? (room.amenities as string).split(",").map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(room.amenities)
        ? room.amenities
        : [];

  return (
    <div
      data-room-card
      className="w-full rounded-2xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg flex flex-col justify-between"
    >
      <div>
        {/* Room photo */}
        <div className="relative h-52 bg-slate-100">
          {coverPhoto ? (
            <Image
              src={coverPhoto.url}
              alt={room.name}
              fill
              sizes="(max-width: 768px) 80vw, 360px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <CameraIcon className="h-10 w-10 text-slate-200" />
            </div>
          )}
          {room.room_photos && room.room_photos.length > 1 && (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <CameraIcon className="h-3 w-3" />
              {room.room_photos.length}
            </span>
          )}
        </div>

        {/* Room info */}
        <div className="p-5">
          <h3 className="text-base font-bold text-slate-900 mb-2">{room.name}</h3>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              {room.capacity || (room.adults ?? 2) + (room.children ?? 0)} guests
            </span>
            <span className="flex items-center gap-1">
              <BedIcon className="h-3.5 w-3.5" />
              {room.bedroom_type || "Standard bed"}
            </span>
          </div>

          {/* Room amenities preview */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {amenities.slice(0, 4).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                >
                  {amenity}
                </span>
              ))}
              {amenities.length > 4 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  +{amenities.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price + CTA */}
      <div className="p-5 border-t border-slate-100 flex items-end justify-between bg-slate-50/50">
        <div>
          <Price
            amount={Number(room.price)}
            className="text-lg font-bold text-slate-900"
          />
          <p className="text-xs text-slate-400">per night</p>
        </div>
        <Link
          href={`/hotels/${hotelId}/book`}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition shadow-sm"
        >
          Reserve
        </Link>
      </div>
    </div>
  );
}
