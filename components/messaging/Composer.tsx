"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Paperclip, Smile, Send, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MessageAttachment } from "@/lib/types";

interface ComposerProps {
  conversationId: string;
  onSend: (body: string | null, attachments: MessageAttachment[]) => Promise<void>;
  disabled?: boolean;
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
  "👍", "👎", "👌", "✌️", "🤞", "🤝", "👏", "🙌", "👋", "✍️", "🙏", "❤️", "💖", "✨", "🔥", "🎉",
  "✈️", "🚗", "🚕", "🚌", "🚇", "🏨", "🏖️", "🌴", "🗺️", "🔑", "💼", "⏰", "📅", "💬", "📸", "✉️"
];

const supabase = createClient();

export default function Composer({ conversationId, onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Image compression helper
  const compressImage = (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
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
              resolve({ blob, width, height });
            } else {
              reject(new Error("Canvas compression failed"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        alert("Only image attachments are supported.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert("Image file size exceeds the 20MB limit.");
        return;
      }

      setUploadProgress(30);
      const { blob, width, height } = await compressImage(file);
      setUploadProgress(60);

      const ext = file.name.split(".").pop() || "jpg";
      const uuid = crypto.randomUUID();
      const path = `${conversationId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(path, blob, { upsert: false });

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      const { data: publicData } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(path);

      setAttachments((prev) => [
        ...prev,
        {
          url: publicData.publicUrl,
          type: "image",
          width,
          height,
        },
      ]);
      setUploadProgress(100);
    } catch (err) {
      console.error("Attachment upload failed:", err);
      alert(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || uploading || (!text.trim() && attachments.length === 0)) return;

    const messageText = text.trim();
    const messageAttachments = [...attachments];

    // Clear composer local state immediately for snappy feel
    setText("");
    setAttachments([]);

    try {
      await onSend(messageText || null, messageAttachments);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Restore input text if send failed
      setText(messageText);
      setAttachments(messageAttachments);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  return (
    <div className="relative border-t border-slate-150 bg-white p-3.5 sm:p-4 rounded-b-2xl">
      {/* Attachments preview list */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 group bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={att.url} alt="Attachment" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading progress indicator */}
      {uploading && (
        <div className="mb-3 flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-550">{uploadProgress}%</span>
        </div>
      )}

      {/* Form layout */}
      <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* File attachment buttons */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-650 transition-colors disabled:opacity-40"
            title="Attach a photo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-650 transition-colors disabled:opacity-40"
            title="Take a photo"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        {/* Input box */}
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a message..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-11 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-350 focus:bg-white transition"
          />

          {/* Emoji Picker button */}
          <div className="absolute right-1 top-1" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setEmojiOpen(!emojiOpen)}
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-650 transition-colors"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Custom Emoji Picker dropdown */}
            {emojiOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-3 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl grid grid-cols-6 gap-1 bg-white/95 backdrop-blur-md">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-slate-50 active:scale-95 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || uploading || (!text.trim() && attachments.length === 0)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-300 transition-colors shadow-sm disabled:shadow-none"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
