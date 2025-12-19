"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string, filters: { type?: string; folder?: string }) => void;
  folders: string[];
}

export default function SearchBar({ onSearch, folders }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query, {
      type: typeFilter || undefined,
      folder: folderFilter || undefined,
    });
  }

  function handleClear() {
    setQuery("");
    setTypeFilter("");
    setFolderFilter("");
    onSearch("", {});
  }

  const fileTypes = [
    { value: "", label: "All types" },
    { value: "image", label: "Images" },
    { value: "video", label: "Videos" },
    { value: "audio", label: "Audio" },
    { value: "pdf", label: "PDFs" },
    { value: "document", label: "Documents" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 pl-9 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
      </div>

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        {fileTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        value={folderFilter}
        onChange={(e) => setFolderFilter(e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">All folders</option>
        {folders.map((f) => (
          <option key={f} value={f}>
            {f || "Root"}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Search
      </button>

      {(query || typeFilter || folderFilter) && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          Clear
        </button>
      )}
    </form>
  );
}
