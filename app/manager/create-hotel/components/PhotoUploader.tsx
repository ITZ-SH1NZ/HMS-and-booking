"use client";

import { useState, useRef } from "react";
// Aliased: the bare `Image` name is the browser's HTMLImageElement constructor,
// used below via `new Image()` to read upload dimensions.
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CameraIcon, TrashIcon, UploadIcon } from "@/components/icons";

interface PhotoUploaderProps {
  hotelId: string;
  category: string;
  roomId?: string;
  multiple?: boolean;
  photos: Array<{ id: string; url: string }>;
  onUpload: (url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  label?: string;
}

const supabase = createClient();

export default function PhotoUploader({
  hotelId,
  category,
  roomId,
  multiple = false,
  photos,
  onUpload,
  onDelete,
  label,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image to a max dimension of 1920px
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context creation failed"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas compression blob failed"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Image loading failed"));
    });
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setProgress(10);

    try {
      const filesArray = Array.from(fileList);
      for (const file of filesArray) {
        // Validation
        if (!file.type.startsWith("image/")) {
          alert("Only image files are allowed.");
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          alert("Maximum file size is 20MB.");
          continue;
        }

        setProgress(30);
        // Compress
        const compressedBlob = await compressImage(file);
        setProgress(50);

        // Upload
        const ext = file.name.split(".").pop() || "jpg";
        const uuid = crypto.randomUUID();
        const path = roomId
          ? `hotels/${hotelId}/rooms/${roomId}/${uuid}.${ext}`
          : `hotels/${hotelId}/${category}/${uuid}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("hotel-images")
          .upload(path, compressedBlob, { upsert: false });

        if (uploadError) throw uploadError;
        setProgress(80);

        // Get public URL
        const { data: publicData } = supabase.storage
          .from("hotel-images")
          .getPublicUrl(path);

        // Save DB Reference
        await onUpload(publicData.publicUrl);
        setProgress(100);
      }
    } catch (err) {
      console.error("Upload error", err);
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 1. Single Mode Layout (Cover Photo)
  if (!multiple) {
    const currentPhoto = photos[0];

    return (
      <div className="flex flex-col">
        {label && (
          <span className="mb-1 text-sm font-medium text-slate-700">
            {label} <span className="text-brand-500">*</span>
          </span>
        )}

        <div className="relative group flex flex-col justify-center items-center h-48 w-full border border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 transition hover:bg-slate-100">
          {currentPhoto ? (
            <>
              <NextImage
                src={currentPhoto.url}
                alt={category}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploading}
                  className="rounded-full bg-white p-2.5 shadow text-slate-700 hover:bg-slate-50 transition"
                  title="Change cover photo"
                >
                  <CameraIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(currentPhoto.id)}
                  disabled={uploading}
                  className="rounded-full bg-white p-2.5 shadow text-brand-600 hover:bg-slate-50 transition"
                  title="Remove cover photo"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="flex flex-col items-center justify-center p-6 h-full w-full"
            >
              <UploadIcon className="h-8 w-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600">
                {uploading ? `Uploading... (${progress}%)` : "Upload cover photo"}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Drag and drop or click to upload
              </span>
            </button>
          )}

          {uploading && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-200">
              <div
                className="h-full bg-brand-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleUpload(e.target.files)}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
      </div>
    );
  }

  // 2. Multiple Mode Layout (Gallery Grid)
  return (
    <div className="flex flex-col">
      {label && (
        <span className="mb-2 text-sm font-medium text-slate-700">
          {label}
        </span>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Gallery Thumbnails */}
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative group h-28 border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
          >
            <NextImage
              src={p.url}
              alt={category}
              fill
              sizes="(max-width: 768px) 50vw, 200px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100 transition shadow"
              title="Delete photo"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Upload Trigger Card */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="flex flex-col items-center justify-center h-28 border border-dashed border-slate-300 rounded-xl bg-slate-50 transition hover:bg-slate-100 hover:border-slate-400 p-2"
        >
          {uploading ? (
            <>
              <span className="text-xs font-medium text-slate-600">
                Uploading...
              </span>
              <div className="w-16 bg-slate-200 h-1 mt-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <UploadIcon className="h-6 w-6 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                Upload photos
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Up to 20MB
              </span>
            </>
          )}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleUpload(e.target.files)}
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />
    </div>
  );
}
