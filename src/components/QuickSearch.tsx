"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FileRecord } from "@/lib/types";
import { getMimeIcon, formatFileSize } from "@/lib/utils";

interface QuickSearchProps {
  userId: string;
}

export default function QuickSearch({ userId }: QuickSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults([]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Search as you type
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      
      const { data } = await supabase
        .from("files")
        .select("*")
        .eq("owner_id", userId)
        .or("is_trashed.is.null,is_trashed.eq.false")
        .ilike("original_name", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setResults(data ?? []);
      setSelectedIndex(0);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, userId]);

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigateToFile(results[selectedIndex]);
    }
  }

  function navigateToFile(file: FileRecord) {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    if (file.folder) {
      router.push(`/files?view=folder&folder=${encodeURIComponent(file.folder)}`);
    } else {
      router.push("/files?view=all");
    }
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
      onClick={() => { setIsOpen(false); setQuery(""); setResults([]); }}
    >
      <div 
        className="w-full max-w-xl bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <span className="text-slate-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none"
          />
          <kbd className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded">Esc</kbd>
        </div>

        {loading && (
          <div className="p-4 text-center text-slate-400">Searching...</div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="p-4 text-center text-slate-400">No files found</div>
        )}

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((file, i) => (
              <button
                key={file.id}
                onClick={() => navigateToFile(file)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex ? "bg-slate-700" : "hover:bg-slate-700/50"
                }`}
              >
                <span className="text-xl">{getMimeIcon(file.mime_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{file.original_name}</p>
                  <p className="text-xs text-slate-500">
                    {file.folder || "All files"} • {formatFileSize(file.size)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!query && (
          <div className="p-4 text-center text-slate-500 text-sm">
            Type to search your files
          </div>
        )}
      </div>
    </div>
  );
}
