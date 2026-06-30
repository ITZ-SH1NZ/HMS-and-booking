"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Paperclip, Smile, Send, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

interface ComposerProps {
  conversationId: string;
  onSend: (body: string | null, files: File[]) => Promise<void>;
  disabled?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

export default function Composer({
  onSend,
  disabled = false,
  onTyping,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAttachments((prev) => {
      const next = [...prev, ...validFiles];
      previews.forEach((url) => URL.revokeObjectURL(url));
      const newUrls = next.map((file) => URL.createObjectURL(file));
      setPreviews(newUrls);
      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      previews.forEach((url) => URL.revokeObjectURL(url));
      const newUrls = next.map((file) => URL.createObjectURL(file));
      setPreviews(newUrls);
      return next;
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || (!text.trim() && attachments.length === 0)) return;

    const messageText = text.trim();
    const messageFiles = [...attachments];

    setText("");
    setAttachments([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);

    try {
      await onSend(messageText || null, messageFiles);
    } catch (err) {
      console.error("Failed to send message:", err);
      setText(messageText);
      setAttachments(messageFiles);
      const newUrls = messageFiles.map((file) => URL.createObjectURL(file));
      setPreviews(newUrls);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setText(newText);
      
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText((prev) => prev + emoji);
    }
    setEmojiOpen(false);
  };

  return (
    <div className="bg-[#F8F9FA] px-4 pb-4 md:px-6 md:pb-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Attachments preview list */}
        {previews.length > 0 && (
          <div className="mb-3 p-3 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 flex flex-wrap gap-3 shadow-2xs animate-fade-in">
            {previews.map((url, idx) => (
              <div
                key={idx}
                className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xs group/thumb"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Attachment preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer shadow-sm"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating Glassmorphism Composer Bar */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 p-2 rounded-full shadow-2xs focus-within:shadow-xs focus-within:border-slate-300 transition duration-300">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* Attachment buttons */}
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40 cursor-pointer"
              title="Attach photos"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Input field */}
          <div className="relative flex-1">
            <input
              type="text"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Type a message..."
              className="w-full bg-transparent py-2.5 pl-1 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none"
            />

            {/* Emoji Picker */}
            <div className="absolute right-1 top-1" ref={emojiRef}>
              <button
                type="button"
                onClick={() => setEmojiOpen(!emojiOpen)}
                disabled={disabled}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-750 transition cursor-pointer"
              >
                <Smile className="h-4.5 w-4.5" />
              </button>

              {emojiOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-4 animate-fade-in">
                  <EmojiPicker onSelectEmoji={insertEmoji} />
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A4335] text-white hover:bg-brand-900 hover:scale-[1.03] disabled:bg-slate-100 disabled:text-slate-300 disabled:scale-100 transition-all shadow-3xs active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>

      </div>
    </div>
  );
}
