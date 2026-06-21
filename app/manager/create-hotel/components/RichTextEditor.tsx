"use client";

import { useRef, useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxChars?: number;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  maxChars = 2000,
  placeholder = "Start writing detailed information...",
  label,
  required,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [charCount, setCharCount] = useState(0);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const updateCharCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      // Strip trailing newlines contentEditable leaves
      const normalizedText = text.replace(/\n$/, "");
      setCharCount(normalizedText.length);
    }
  };

  // Load initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
      updateCharCount();
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText || "";
      const normalizedText = text.replace(/\n$/, "");

      if (normalizedText.length > maxChars) {
        // Visually flagged in character count/styling
      }

      onChange(html === "<br>" ? "" : html);
      updateCharCount();
    }
  };

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    updateActiveStyles();
    handleInput();
  };

  const updateActiveStyles = () => {
    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const handleAddLink = () => {
    const url = prompt("Enter link URL (e.g. https://example.com):");
    if (url) {
      execCommand("createLink", url);
    }
  };

  return (
    <div className="flex flex-col">
      {label && (
        <label className="mb-1 text-sm font-medium text-slate-700">
          {label} {required && <span className="text-brand-500">*</span>}
        </label>
      )}

      <div className="flex flex-col rounded-lg border border-slate-300 overflow-hidden focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => execCommand("bold")}
            className={`rounded px-2.5 py-1 text-sm font-bold transition hover:bg-slate-200 ${
              activeStyles.bold ? "bg-slate-300 text-slate-900" : "text-slate-700"
            }`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execCommand("italic")}
            className={`rounded px-2.5 py-1 text-sm italic transition hover:bg-slate-200 ${
              activeStyles.italic ? "bg-slate-300 text-slate-900" : "text-slate-700"
            }`}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execCommand("underline")}
            className={`rounded px-2.5 py-1 text-sm underline transition hover:bg-slate-200 ${
              activeStyles.underline ? "bg-slate-300 text-slate-900" : "text-slate-700"
            }`}
            title="Underline"
          >
            U
          </button>
          <span className="h-6 w-px bg-slate-200 self-center mx-1" />
          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            title="Bulleted list"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            title="Numbered list"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={handleAddLink}
            className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            title="Insert link"
          >
            Link
          </button>
        </div>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onSelect={updateActiveStyles}
          onKeyUp={updateActiveStyles}
          onMouseUp={updateActiveStyles}
          onBlur={handleInput}
          className="min-h-[160px] p-3 text-sm text-slate-800 outline-none overflow-y-auto bg-white empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
          data-placeholder={placeholder}
          style={{ minHeight: "160px" }}
        />
      </div>

      {/* Footer / Counters */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-slate-400">
          Supports Basic HTML Styling
        </span>
        <span
          className={`text-xs ${
            charCount > maxChars ? "font-semibold text-brand-500" : "text-slate-400"
          }`}
        >
          {charCount}/{maxChars}
        </span>
      </div>
    </div>
  );
}
