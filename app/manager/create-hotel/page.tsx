"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputClass, primaryBtn } from "@/components/AuthCard";
import { Field } from "@/components/FormBits";

export default function CreateHotelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [roomName, setRoomName] = useState("Standard Room");
  const [price, setPrice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You must be logged in.");
      return;
    }

    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .insert({
        manager_id: user.id,
        name,
        location,
        description,
        image_url: imageUrl || null,
        status: "pending",
      })
      .select()
      .single();

    if (hotelError || !hotel) {
      setLoading(false);
      setError(hotelError?.message ?? "Could not create hotel.");
      return;
    }

    if (price) {
      const { error: roomError } = await supabase.from("rooms").insert({
        hotel_id: hotel.id,
        name: roomName || "Standard Room",
        price: Number(price),
      });
      if (roomError) {
        setLoading(false);
        setError(`Hotel created, but adding the room failed: ${roomError.message}`);
        return;
      }
    }

    router.push("/manager/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Create a new hotel</h1>
      <p className="text-sm text-slate-500">
        Your hotel will be reviewed by an admin before it appears publicly.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <Field label="Hotel name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Location">
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" required />
        </Field>
        <Field label="Description">
          <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Image URL">
          <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starter room name">
            <input className={inputClass} value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          </Field>
          <Field label="Price / night ($)">
            <input type="number" min="0" step="1" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Creating…" : "Create hotel"}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-400">
        Tip: enter prices in USD ($) — they become the hotel&apos;s starting
        price and are shown to each visitor converted to their local currency.
        You can add more rooms later.
      </p>
    </div>
  );
}
