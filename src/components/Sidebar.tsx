"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SidebarProps {
  folders: string[];
  currentFolder: string;
  onFolderCreated?: (folderName: string) => void;
  onFileDrop?: (fileId: string, targetFolder: string) => void;
}

export default function Sidebar({ folders, currentFolder, onFolderCreated, onFileDrop }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const view = searchParams.get("view") ?? "all";

  function navigateTo(newView: string, folder?: string) {
    const params = new URLSearchParams();
    params.set("view", newView);
    if (folder) {
      params.set("folder", folder);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleCreateFolder() {
    const trimmed = newFolderName.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
      setIsCreating(false);
      setNewFolderName("");
      return;
    }
    onFolderCreated?.(trimmed);
    navigateTo("folder", trimmed);
    setIsCreating(false);
    setNewFolderName("");
  }

  const navItems = [
    { id: "all", label: "All files", icon: "📁" },
    { id: "recent", label: "Recent", icon: "🕐" },
    { id: "starred", label: "Starred", icon: "⭐" },
    { id: "shared", label: "Shared", icon: "🔗" },
    { id: "duplicates", label: "Duplicates", icon: "📋" },
    { id: "trash", label: "Trash", icon: "🗑" },
  ];

  const uniqueFolders = Array.from(new Set(folders)).filter(Boolean).sort();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-700 bg-slate-800 flex flex-col">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              view === item.id && !searchParams.get("folder")
                ? "bg-slate-700 text-white font-medium"
                : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 pt-4 pb-2 flex-1">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Folders
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs text-blue-400 hover:text-blue-300"
            title="New folder"
          >
            + New
          </button>
        </div>

        {isCreating && (
          <div className="mb-2 px-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Folder name"
              className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleCreateFolder}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName("");
                }}
                className="flex-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {uniqueFolders.map((folder) => (
            <button
              key={folder}
              onClick={() => navigateTo("folder", folder)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverFolder(folder);
              }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => {
                e.preventDefault();
                const fileId = e.dataTransfer.getData("fileId");
                if (fileId && onFileDrop) {
                  onFileDrop(fileId, folder);
                }
                setDragOverFolder(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                dragOverFolder === folder
                  ? "bg-blue-600 text-white"
                  : currentFolder === folder
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
              }`}
            >
              <span>📂</span>
              <span className="truncate">{folder || "Root"}</span>
            </button>
          ))}
          {uniqueFolders.length === 0 && !isCreating && (
            <p className="px-3 py-2 text-xs text-slate-500">No folders yet</p>
          )}
        </div>
      </div>
    </aside>
  );
}
