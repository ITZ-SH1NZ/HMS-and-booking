"use client";

import { useState } from "react";
import RoomEditor from "./RoomEditor";
import Toggle from "../components/Toggle";
import { BedIcon, PencilIcon, TrashIcon } from "@/components/icons";
import type { RoomDraft } from "@/lib/types";

import { UseHotelDraftReturn } from "../useHotelDraft";

interface Step4RoomsProps {
  draftContext: UseHotelDraftReturn;
}

export default function Step4Rooms({ draftContext }: Step4RoomsProps) {
  const {
    draft,
    rooms,
    saveRoom,
    removeRoom,
    reorderRoomsList,
  } = draftContext;

  const [activeTab, setActiveTab] = useState<"types" | "rates">("types");
  const [editingRoom, setEditingRoom] = useState<RoomDraft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  if (!draft) return null;

  const handleAddNewRoom = async () => {
    // 1. Create a skeleton room first to get a valid UUID for photo uploads
    const tempSkeleton: Partial<RoomDraft> = {
      name: "Temporary Skeleton",
      price: 0,
      capacity: 2,
      total_units: 1,
      is_active: false,
      sort_order: rooms.length,
    };
    try {
      // Save skeleton
      await saveRoom(tempSkeleton);
      // Retrieve the newly created skeleton room (the last one or by temp name)
      const freshRooms = draftContext.rooms;
      const created = freshRooms.find((r: RoomDraft) => r.name === "Temporary Skeleton");
      if (created) {
        setEditingRoom(created);
        setEditorOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create new room slot");
    }
  };

  const handleEditRoom = (room: RoomDraft) => {
    setEditingRoom(room);
    setEditorOpen(true);
  };

  const handleSaveRoom = async (roomData: Partial<RoomDraft>) => {
    await saveRoom({
      ...roomData,
      is_active: true, // Mark active when saved
    });
    setEditorOpen(false);
    setEditingRoom(null);
  };

  const handleCancelEditor = async () => {
    // If it was a skeleton room, delete it on cancel
    if (editingRoom && editingRoom.name === "Temporary Skeleton") {
      await removeRoom(editingRoom.id);
    }
    setEditorOpen(false);
    setEditingRoom(null);
  };

  const handleToggleActive = async (room: RoomDraft, checked: boolean) => {
    await saveRoom({
      ...room,
      is_active: checked,
    });
  };

  // Reordering logic
  const handleMove = async (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= rooms.length) return;

    const reordered = [...rooms];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    // Update sort order values
    const payload = reordered.map((r, i) => ({
      id: r.id,
      sort_order: i,
    }));

    await reorderRoomsList(payload);
  };

  // Inline rate setter handler
  const handleRateChange = async (room: RoomDraft, valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      await saveRoom({
        ...room,
        price: val,
      });
    }
  };

  // Room Summary Statistics
  const activeRooms = rooms.filter((r: RoomDraft) => r.is_active);
  const totalRoomTypes = activeRooms.length;
  const totalRoomsCount = activeRooms.reduce((sum: number, r: RoomDraft) => sum + (r.total_units || 0), 0);
  const maxGuests = activeRooms.reduce((max: number, r: RoomDraft) => Math.max(max, r.capacity || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Tabs bar */}
          <div className="flex border-b border-slate-100 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("types")}
              className={`pb-3 text-sm font-bold border-b-2 px-1 transition ${
                activeTab === "types"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Room types
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rates")}
              className={`pb-3 text-sm font-bold border-b-2 px-1 ml-6 transition ${
                activeTab === "rates"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Room rate settings
            </button>
          </div>

          {/* TAB 1: Room Types List */}
          {activeTab === "types" && (
            <div className="space-y-4">
              {rooms.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                  <BedIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-600 block">No rooms added yet</span>
                  <span className="text-xs text-slate-400">Add rooms to receive bookings on your property.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rooms
                    .filter((r: RoomDraft) => r.name !== "Temporary Skeleton")
                    .map((room: RoomDraft, idx: number) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 shrink-0">
                            <BedIcon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{room.name}</span>
                            <span className="text-xs text-slate-500">
                              {room.bedroom_type || "Standard Bed"} · {room.capacity || 2} Guests
                            </span>
                            <span className="text-xs font-semibold text-emerald-700 mt-0.5">
                              ₹{room.price}/night
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {/* Reordering Controls */}
                          {rooms.length > 1 && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMove(idx, "up")}
                                className="text-[10px] font-bold border border-slate-200 bg-white px-1 py-0.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === rooms.length - 1}
                                onClick={() => handleMove(idx, "down")}
                                className="text-[10px] font-bold border border-slate-200 bg-white px-1 py-0.5 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              >
                                ▼
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEditRoom(room)}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                            title="Edit room"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeRoom(room.id)}
                            className="p-2 border border-slate-200 rounded-lg text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition"
                            title="Delete room"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>

                          <Toggle
                            checked={room.is_active ?? true}
                            onChange={(checked) => handleToggleActive(room, checked)}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddNewRoom}
                className="w-full py-3 border border-dashed border-emerald-300 text-emerald-800 rounded-xl bg-emerald-50/40 hover:bg-emerald-50 font-bold text-xs transition flex items-center justify-center gap-1.5 mt-4"
              >
                + Add new room
              </button>
            </div>
          )}

          {/* TAB 2: Room Rate Settings Grid */}
          {activeTab === "rates" && (
            <div className="space-y-4">
              {rooms.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  Add rooms first to configure pricing rates.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                        <th className="p-3">Room type</th>
                        <th className="p-3">Bed type</th>
                        <th className="p-3">Units</th>
                        <th className="p-3 w-40">Price / Night (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {rooms
                        .filter((r: RoomDraft) => r.name !== "Temporary Skeleton" && r.is_active)
                        .map((room: RoomDraft) => (
                          <tr key={room.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">
                              {room.name}
                            </td>
                            <td className="p-3 text-slate-500">
                              {room.bedroom_type || "King Bed"}
                            </td>
                            <td className="p-3 text-slate-500 font-semibold">
                              {room.total_units || 1}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={1}
                                className="w-full border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-600 text-xs"
                                value={room.price || ""}
                                onChange={(e) => handleRateChange(room, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Room Summary Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">
            Room summary
          </h4>

          <div className="space-y-3 text-xs leading-normal">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total room types</span>
              <span className="text-slate-800 font-bold">{totalRoomTypes}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total rooms</span>
              <span className="text-slate-800 font-bold">{totalRoomsCount}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Max guests capacity</span>
              <span className="text-slate-800 font-bold">{maxGuests} Guests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Editor Modal Sub-screen */}
      {editorOpen && (
        <RoomEditor
          hotelId={draft.id}
          room={editingRoom}
          onSave={handleSaveRoom}
          onCancel={handleCancelEditor}
        />
      )}
    </div>
  );
}
