"use client";

import { useState, useMemo } from "react";
import { Search, Clock, Smile, Hand, Plane, Heart } from "lucide-react";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
}

const SKIN_TONES = [
  { id: "default", char: "🟡", modifier: "" },
  { id: "light", char: "🏻", modifier: "\u{1F3FB}" },
  { id: "medium-light", char: "🏼", modifier: "\u{1F3FC}" },
  { id: "medium", char: "🏽", modifier: "\u{1F3FD}" },
  { id: "medium-dark", char: "🏾", modifier: "\u{1F3FE}" },
  { id: "dark", char: "🏿", modifier: "\u{1F3FF}" },
];

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys & Emotion",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
      "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
      "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥",
      "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
    ],
  },
  {
    id: "people",
    name: "Gestures & People",
    icon: Hand,
    supportsSkinTones: true,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕",
      "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅",
      "🤳", "💪", "👂", "👃", "🧠", "🦷", "👁️", "👀", "👤", "👥",
    ],
  },
  {
    id: "travel",
    name: "Travel & Places",
    icon: Plane,
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚚", "🚜", "🚲", "🛴", "🛵", "🏍️", "🚨",
      "✈️", "🛫", "🛬", "⛵", "🛥️", "🚢", "🗺️", "🏔️", "⛰️", "🏕️", "🏖️", "🏜️", "🏝️", "🏨", "🏨", "🏢",
      "🏠", "🏡", "🏛️", "🗼", "🎡", "🎢", "🏖️", "🌴", "🔑", "🔑", "💼", "⏰", "📅", "⏳",
    ],
  },
  {
    id: "symbols",
    name: "Objects & Symbols",
    icon: Heart,
    emojis: [
      "❤️", "💖", "💝", "🖤", "💛", "💚", "💙", "💜", "🤍", "🤎", "💕", "💞", "✨", "🔥", "🎉", "⚡",
      "💬", "💭", "✉️", "📩", "📧", "🛎️", "🧳", "📸", "📷", "💡", "💰", "💵", "💳", "🔒", "🔓", "🔔",
      "🎵", "🎶", "🎙️", "🎁", "🎈", "🎨", "🏆", "🌟", "⭐", "☀️", "🌙", "☁️", "🌧️", "❄️", "💤", "💯",
    ],
  },
];

export default function EmojiPicker({ onSelectEmoji }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [skinTone, setSkinTone] = useState<string>("default");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("booknest_recent_emojis");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Failed to load recent emojis", e);
        return [];
      }
    }
    return [];
  });

  const activeSkinToneModifier = useMemo(() => {
    const tone = SKIN_TONES.find((t) => t.id === skinTone);
    return tone ? tone.modifier : "";
  }, [skinTone]);

  // Handle emoji selection
  const handleEmojiClick = (emoji: string, isPerson: boolean) => {
    // Apply skin tone if applicable
    const finalEmoji = isPerson ? emoji + activeSkinToneModifier : emoji;
    onSelectEmoji(finalEmoji);

    // Save to recently used
    setRecentEmojis((prev) => {
      const updated = [finalEmoji, ...prev.filter((e) => e !== finalEmoji)].slice(0, 18);
      try {
        localStorage.setItem("booknest_recent_emojis", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Filter emojis based on search and category
  const filteredCategories = useMemo(() => {
    return EMOJI_CATEGORIES.map((cat) => {
      // If we're filtering by a specific category and it doesn't match, return empty emojis
      if (activeCategory !== "all" && cat.id !== activeCategory) {
        return { ...cat, emojis: [] };
      }

      // Filter emojis by search query
      if (!search.trim()) {
        return cat;
      }

      const query = search.toLowerCase();
      // Simple lookup/filtering (since we don't have descriptions, we filter by emoji character or category name)
      // As a fallback, we can match if the category matches, or just show all in category for short query.
      // Alternatively, we can just filter by category. To make search useful, let's keep all emojis if no match, 
      // or match common ones (in a real app we'd have a keyword map, here we can do a basic mapping for popular emojis).
      const matched = cat.emojis.filter((emoji) => {
        // Simple heuristic mapping
        const emojiMap: Record<string, string[]> = {
          smile: ["😀", "😃", "😄", "😁", "😆", "😅", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋"],
          laugh: ["😅", "😂", "🤣", "😆"],
          sad: ["😞", "😔", "😟", "😕", "🙁", "☹️", "😢", "😭", "😥", "😓"],
          angry: ["😤", "😠", "😡", "🤬"],
          heart: ["❤️", "💖", "💝", "🖤", "💛", "💚", "💙", "💜", "🤍", "🤎", "💕", "💞"],
          thumbs: ["👍", "👎"],
          hand: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👏", "🙌", "👐", "🤲", "🙏"],
          hotel: ["🏨", "🛎️", "🧳", "🔑"],
          car: ["🚗", "🚕", "🚙", "🚌"],
          plane: ["✈️", "🛫", "🛬"],
          star: ["🌟", "⭐"],
          fire: ["🔥"],
          party: ["🎉", "🎁", "🎈"],
        };

        for (const [key, list] of Object.entries(emojiMap)) {
          if (key.includes(query) && list.includes(emoji)) {
            return true;
          }
        }
        return false;
      });

      return { ...cat, emojis: matched };
    });
  }, [search, activeCategory]);

  const hasSearchResults = useMemo(() => {
    return filteredCategories.some((c) => c.emojis.length > 0);
  }, [filteredCategories]);

  return (
    <div className="flex flex-col h-72 w-72 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-800 bg-white/95 backdrop-blur-md">
      {/* Search Input */}
      <div className="p-2 border-b border-slate-100 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full rounded-lg border border-slate-150 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-50 border-b border-slate-100">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveCategory("all");
              setSearch("");
            }}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition ${
              activeCategory === "all" ? "text-brand-650 bg-white shadow-xs" : ""
            }`}
            title="All Categories"
          >
            <span className="text-xs font-bold px-0.5">All</span>
          </button>
          
          {recentEmojis.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory("recent");
                setSearch("");
              }}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition ${
                activeCategory === "recent" ? "text-brand-650 bg-white shadow-xs" : ""
              }`}
              title="Recently Used"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearch("");
                }}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition ${
                  activeCategory === cat.id ? "text-brand-650 bg-white shadow-xs" : ""
                }`}
                title={cat.name}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {activeCategory === "recent" || (activeCategory === "all" && !search && recentEmojis.length > 0) ? (
          <div>
            <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 px-1">
              Recently Used
            </div>
            <div className="grid grid-cols-8 gap-1">
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-slate-100 active:scale-90 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeCategory !== "recent" && (
          <>
            {filteredCategories.map((cat) => {
              if (cat.emojis.length === 0) return null;
              return (
                <div key={cat.id}>
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 px-1 flex justify-between items-center">
                    <span>{cat.name}</span>
                    {cat.supportsSkinTones && (
                      <div className="flex gap-0.5 items-center">
                        {SKIN_TONES.map((tone) => (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => setSkinTone(tone.id)}
                            className={`h-2.5 w-2.5 rounded-full border border-black/10 hover:scale-125 transition-transform flex items-center justify-center ${
                              skinTone === tone.id ? "ring-1 ring-brand-500" : ""
                            }`}
                            style={{
                              backgroundColor:
                                tone.id === "default"
                                  ? "#FFD225"
                                  : tone.id === "light"
                                  ? "#F7D5C4"
                                  : tone.id === "medium-light"
                                  ? "#E2B39A"
                                  : tone.id === "medium"
                                  ? "#C6967D"
                                  : tone.id === "medium-dark"
                                  ? "#A16C50"
                                  : "#6A4533",
                            }}
                            title={`Skin Tone: ${tone.id}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.emojis.map((emoji) => {
                      const finalEmoji = cat.supportsSkinTones ? emoji + activeSkinToneModifier : emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji, !!cat.supportsSkinTones)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-slate-100 active:scale-90 transition-transform"
                        >
                          {finalEmoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!hasSearchResults && search && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Smile className="h-6 w-6 mb-1 text-slate-350" />
                <span className="text-xs font-semibold">No matching emojis</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
