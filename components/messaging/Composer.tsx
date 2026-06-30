"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Paperclip, Smile, Send, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MessageAttachment } from "@/lib/types";
import EmojiPicker from "./EmojiPicker";

interface ComposerProps {
  conversationId: string;
  onSend: (body: string | null, attachments: MessageAttachment[]) => Promise<void>;
  disabled?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

const supabase = createClient();

export default function Composer({
  conversationId,
  onSend,
  disabled = false,
  onTyping,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

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

  // Typing status effect
  useEffect(() => {
    if (!onTyping) return;

    if (text.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping(true);
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping(false);
      }, 3000);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, onTyping]);

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

    const filesArray = Array.from(files);
    const validFiles = filesArray.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`"${file.name}" is not a supported image format.`);
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 20MB size limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Start uploads in parallel
    validFiles.forEach(async (file) => {
      const uploadId = crypto.randomUUID();
      
      setUploadingFiles((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 10 },
      ]);

      try {
        // 1. Compress image
        const { blob, width, height } = await compressImage(file);
        
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === uploadId ? { ...f, progress: 40 } : f))
        );

        // 2. Generate unique path (conversationId/uuid.jpg)
        const ext = file.name.split(".").pop() || "jpg";
        const fileUuid = crypto.randomUUID();
        const path = `${conversationId}/${fileUuid}.${ext}`;

        // 3. Upload to Supabase Storage with progress tracking
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(path, blob, {
            upsert: false,
            onUploadProgress: (event: { loaded: number; total: number }) => {
              const progress = Math.round((event.loaded / event.total) * 40) + 40; // scales from 40% to 80%
              setUploadingFiles((prev) =>
                prev.map((f) => (f.id === uploadId ? { ...f, progress } : f))
              );
            },
          } as unknown as Record<string, unknown>);

        if (uploadError) throw uploadError;

        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === uploadId ? { ...f, progress: 90 } : f))
        );

        // 4. Add to attachments. Store ONLY the bare storage path
        setAttachments((prev) => [
          ...prev,
          {
            url: path, // bare path
            type: "image",
            width,
            height,
          },
        ]);

        // Remove from uploading files list
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
      } catch (err) {
        console.error(`Attachment upload failed for "${file.name}":`, err);
        alert(`Failed to upload "${file.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || uploadingFiles.length > 0 || (!text.trim() && attachments.length === 0)) return;

    const messageText = text.trim();
    const messageAttachments = [...attachments];

    // Clear local composer state immediately
    setText("");
    setAttachments([]);

    try {
      await onSend(messageText || null, messageAttachments);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Restore state on failure
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

  // Insert emoji at the caret position
  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setText(newText);
      
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText((prev) => prev + emoji);
    }
    setEmojiOpen(false);
  };

  const getAttachmentDisplayUrl = (path: string) => {
    return `/api/messages/attachment?path=${encodeURIComponent(path)}`;
  };

  return (
    <div className="relative border-t border-slate-150 bg-white p-3.5 sm:p-4 rounded-b-2xl">
      {/* Uploading files progress list */}
      {uploadingFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-2.5 text-xs text-slate-650">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 shrink-0" />
              <span className="truncate max-w-[150px] font-semibold">{file.name}</span>
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-550 shrink-0">{file.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Attachments preview list */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 group bg-slate-50 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAttachmentDisplayUrl(att.url)}
                alt="Attachment"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form layout */}
      <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploadingFiles.length > 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
            title="Attach photos"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploadingFiles.length > 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
            title="Take photo"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        {/* Input box */}
        <div className="relative flex-1">
          <input
            type="text"
            ref={inputRef}
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
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-450 hover:text-slate-750 transition-colors cursor-pointer"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Custom Emoji Picker dropdown */}
            {emojiOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-3">
                <EmojiPicker onSelectEmoji={insertEmoji} />
              </div>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={
            disabled ||
            uploadingFiles.length > 0 ||
            (!text.trim() && attachments.length === 0)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-300 transition-colors shadow-sm disabled:shadow-none cursor-pointer shrink-0"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
