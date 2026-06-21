"use client";

import { useState, useEffect } from "react";
import ChipMultiSelect from "../components/ChipMultiSelect";
import PhotoUploader from "../components/PhotoUploader";
import { PlusIcon, MinusIcon } from "@/components/icons";
import { getRoomPhotos, insertRoomPhoto, deleteRoomPhoto } from "@/lib/hotelDraft";
import type { RoomDraft, RoomPhoto } from "@/lib/types";

interface RoomEditorProps {
  hotelId: string;
  room: RoomDraft | null;
  onSave: (room: Partial<RoomDraft>) => Promise<void>;
  onCancel: () => void;
}

const BEDROOM_TYPES = [
  "1 King Bed",
  "1 Queen Bed",
  "2 Single Beds",
  "1 King + 1 Single",
  "Bunk Bed",
  "Double Bed",
];

const ROOM_AMENITIES = [
  "Air Conditioning",
  "Free Wi-Fi",
  "Flat-screen TV",
  "Mini Fridge",
  "Work Desk",
  "Electric Kettle",
  "Balcony",
  "In-room Safe",
  "Toiletries",
  "Hairdryer",
];

export default function RoomEditor({
  hotelId,
  room,
  onSave,
  onCancel,
}: RoomEditorProps) {
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [bedroomType, setBedroomType] = useState("1 King Bed");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomSize, setRoomSize] = useState("");
  const [totalUnits, setTotalUnits] = useState(1);
  const [price, setPrice] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [roomPhotos, setRoomPhotos] = useState<RoomPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const loadRoomPhotos = async (roomId: string) => {
    try {
      setLoadingPhotos(true);
      const data = await getRoomPhotos(roomId);
      setRoomPhotos(data);
    } catch (err) {
      console.error("Failed to load room photos", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Sync state if editing existing room
  useEffect(() => {
    if (room) {
      const timer = setTimeout(() => {
        setName(room.name || "");
        setShortDescription(room.short_description || "");
        setBedroomType(room.bedroom_type || "1 King Bed");
        setAdults(room.adults ?? 2);
        setChildren(room.children ?? 0);
        setRoomSize(room.room_size || "");
        setTotalUnits(room.total_units ?? 1);
        setPrice(room.price ? room.price.toString() : "");
        setAmenities(room.amenities || []);
        loadRoomPhotos(room.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [room]);

  const handlePhotoUpload = async (url: string) => {
    if (!room) return;
    try {
      const sortOrder = roomPhotos.length;
      await insertRoomPhoto(room.id, url, sortOrder);
      await loadRoomPhotos(room.id);
    } catch (err) {
      console.error(err);
      alert("Failed to attach photo to room");
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      await deleteRoomPhoto(photoId);
      await loadRoomPhotos(room!.id);
    } catch (err) {
      console.error(err);
      alert("Failed to remove room photo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return alert("Room name is required.");
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) return alert("Nightly rate must be greater than 0.");
    if (totalUnits < 1) return alert("Number of rooms must be at least 1.");
    if (adults < 1) return alert("Adults capacity must be at least 1.");

    await onSave({
      id: room?.id,
      name,
      short_description: shortDescription,
      bedroom_type: bedroomType,
      adults,
      children,
      room_size: roomSize,
      total_units: totalUnits,
      price: priceVal,
      amenities,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-zoomIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            {room?.name === "Temporary Skeleton" ? "Add a new room" : `Edit ${room?.name || "room type"}`}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none w-8 h-8 rounded-full hover:bg-slate-100 transition flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Room Name */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-semibold text-slate-700">
              Room name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deluxe Room"
              required
            />
          </div>

          {/* Short Description */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">
                Short description
              </label>
              <span className="text-xs text-slate-400">
                {shortDescription.length}/200
              </span>
            </div>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary of room highlights..."
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bedroom Type */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-slate-700">
                Bedroom type <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                value={bedroomType}
                onChange={(e) => setBedroomType(e.target.value)}
                required
              >
                {BEDROOM_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Room Size */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-slate-700">
                Room size (sq ft)
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                value={roomSize}
                onChange={(e) => setRoomSize(e.target.value)}
                placeholder="e.g. 280"
              />
            </div>

            {/* Stepper Capacities */}
            <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-xs font-semibold text-slate-700">Adults</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdults((a) => Math.max(1, a - 1))}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  className="w-12 text-center bg-transparent border-0 font-extrabold text-slate-800 text-sm outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={adults}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdults(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setAdults((a) => a + 1)}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-xs font-semibold text-slate-700">Children</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChildren((c) => Math.max(0, c - 1))}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={0}
                  className="w-12 text-center bg-transparent border-0 font-extrabold text-slate-800 text-sm outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={children}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setChildren(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setChildren((c) => c + 1)}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Nightly Price */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-slate-700">
                Price / night (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 3500"
                required
              />
            </div>

            {/* Total Units (Number of rooms) */}
            <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700">Number of rooms</span>
                <span className="text-[10px] text-slate-500">Units in inventory</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTotalUnits((u) => Math.max(1, u - 1))}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  className="w-12 text-center bg-transparent border-0 font-extrabold text-slate-800 text-sm outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={totalUnits}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTotalUnits(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setTotalUnits((u) => u + 1)}
                  className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600 transition"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* In-room Amenities */}
          <div>
            <ChipMultiSelect
              label="In-room amenities"
              selected={amenities}
              onChange={setAmenities}
              options={ROOM_AMENITIES}
              placeholder="Add amenity..."
            />
          </div>

          {/* Room Photos */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-sm font-semibold text-slate-700 block mb-2">
              Room photos <span className="text-rose-500">*</span>
            </span>
            {loadingPhotos ? (
              <span className="text-xs text-slate-400">Loading photos...</span>
            ) : (
              <PhotoUploader
                hotelId={hotelId}
                category="rooms"
                roomId={room?.id}
                multiple
                photos={roomPhotos}
                onUpload={handlePhotoUpload}
                onDelete={handlePhotoDelete}
              />
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-sm font-semibold text-white transition"
          >
            Save room
          </button>
        </div>
      </div>
    </div>
  );
}
