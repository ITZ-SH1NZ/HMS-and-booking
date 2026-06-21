"use client";

import PhotoUploader from "../components/PhotoUploader";

import { UseHotelDraftReturn } from "../useHotelDraft";
import type { HotelPhoto } from "@/lib/types";

interface Step3PhotosProps {
  draftContext: UseHotelDraftReturn;
}

const CATEGORIES = [
  { id: "cover", label: "Cover photo", helper: "This photo will be the first image shown to guests.", multiple: false },
  { id: "exterior", label: "Property exterior", helper: "The building and surroundings.", multiple: true },
  { id: "lobby", label: "Lobby & reception", helper: "Show your lobby and front desk area.", multiple: true },
  { id: "rooms", label: "Rooms", helper: "Show different room views.", multiple: true },
  { id: "restaurant", label: "Restaurant & dining", helper: "Show dining area and restaurant.", multiple: true },
  { id: "pool", label: "Swimming pool", helper: "Show pool and leisure areas.", multiple: true },
  { id: "amenities", label: "Amenities", helper: "Gym, spa, parking, indoor.", multiple: true },
  { id: "bathroom", label: "Bathroom", helper: "Show bathroom interiors.", multiple: true },
  { id: "other", label: "Other", helper: "Any other photos to showcase.", multiple: true },
];

export default function Step3Photos({ draftContext }: Step3PhotosProps) {
  const { draft, photos, addPhoto, removePhoto } = draftContext;

  if (!draft) return null;

  const handleUpload = async (url: string, category: string) => {
    // Determine sort order based on current photos in this category
    const categoryPhotos = photos.filter((p: HotelPhoto) => p.category === category);
    const sortOrder = categoryPhotos.length;
    await addPhoto(url, category, sortOrder);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Photo Categories Grid */}
      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Photo categories
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Upload high-quality photos to attract more guests. Add at least a cover photo and one room photo to proceed.
          </p>

          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const catPhotos = photos
                .filter((p: HotelPhoto) => p.category === cat.id)
                .map((p: HotelPhoto) => ({ id: p.id, url: p.url }));

              return (
                <div key={cat.id} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                  <div className="mb-2">
                    <span className="text-sm font-bold text-slate-800 block">
                      {cat.label} {cat.id === "cover" && <span className="text-brand-500">*</span>}
                    </span>
                    <span className="text-xs text-slate-500">
                      {cat.helper}
                    </span>
                  </div>
                  <PhotoUploader
                    hotelId={draft.id}
                    category={cat.id}
                    multiple={cat.multiple}
                    photos={catPhotos}
                    onUpload={(url) => handleUpload(url, cat.id)}
                    onDelete={removePhoto}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Guidelines Rail */}
      <div className="lg:col-span-4 space-y-6">
        {/* Tips for great photos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">
            Tips for great photos
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold shrink-0">✓</span>
              <span>Use high-resolution images (at least 1920x1080px).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold shrink-0">✓</span>
              <span>Bright, well-lit photos make rooms look spacious and clean.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold shrink-0">✓</span>
              <span>Show different angles to give guests a complete view.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold shrink-0">✓</span>
              <span>Keep rooms clean and tidy before taking shots.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold shrink-0">✓</span>
              <span>A minimum of 10 photos across categories is recommended.</span>
            </li>
          </ul>
        </div>

        {/* Photo guide requirements */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">
            Photo guide
          </h4>
          <div className="space-y-3 text-xs leading-normal">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Cover photo</span>
              <span className="text-slate-800 font-semibold">Landscape 16:9</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">All other photos</span>
              <span className="text-slate-800 font-semibold">Landscape 4:3</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Max file size</span>
              <span className="text-slate-800 font-semibold">20MB per photo</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Formats</span>
              <span className="text-slate-800 font-semibold">JPG, PNG, WebP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
