"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StorageQuota from "./StorageQuota";
import FolderSettingsModal from "./FolderSettingsModal";
import type { FolderRecord } from "@/lib/types";

interface FolderTreeNode {
  name: string;
  path: string;
  children: FolderTreeNode[];
  color?: string;
  icon?: string;
}

interface SidebarProps {
  folders: string[];
  currentFolder: string;
  userId: string;
  onFolderCreated?: (folderName: string, parentFolder?: string) => void;
  onFileDrop?: (fileId: string, targetFolder: string) => void;
}

export default function Sidebar({ folders, currentFolder, userId, onFolderCreated, onFileDrop }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [folderSettings, setFolderSettings] = useState<Record<string, { icon: string; color: string }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bevisdrive-folder-settings");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

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

  // Build folder tree from path-based folder names (e.g., "Documents/Work/Reports")
  function buildFolderTree(folderPaths: string[]): FolderTreeNode[] {
    const root: FolderTreeNode[] = [];
    
    folderPaths.forEach((path) => {
      const parts = path.split("/");
      let currentLevel = root;
      let currentPath = "";
      
      parts.forEach((part, index) => {
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        let existing = currentLevel.find((n) => n.name === part);
        
        if (!existing) {
          existing = { name: part, path: currentPath, children: [] };
          currentLevel.push(existing);
        }
        
        currentLevel = existing.children;
      });
    });
    
    return root;
  }

  const folderTree = buildFolderTree(uniqueFolders);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  function toggleExpand(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function saveFolderSettings(path: string, icon: string, color: string) {
    const updated = { ...folderSettings, [path]: { icon, color } };
    setFolderSettings(updated);
    localStorage.setItem("bevisdrive-folder-settings", JSON.stringify(updated));
    setEditingFolder(null);
  }

  function renderFolderNode(node: FolderTreeNode, depth: number = 0) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = currentFolder === node.path;
    const isDragOver = dragOverFolder === node.path;
    const settings = folderSettings[node.path];
    const folderIcon = settings?.icon || node.icon || "📂";
    const folderColor = settings?.color;

    return (
      <div key={node.path}>
        <button
          onClick={() => navigateTo("folder", node.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            setEditingFolder(node.path);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverFolder(node.path);
          }}
          onDragLeave={() => setDragOverFolder(null)}
          onDrop={(e) => {
            e.preventDefault();
            const fileId = e.dataTransfer.getData("fileId");
            if (fileId && onFileDrop) {
              onFileDrop(fileId, node.path);
            }
            setDragOverFolder(null);
          }}
          className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors ${
            isDragOver
              ? "bg-blue-600 text-white"
              : isSelected
              ? "bg-slate-700 text-white font-medium"
              : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              className="cursor-pointer text-xs w-4"
            >
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          <span>{folderIcon}</span>
          <span className="truncate" style={folderColor ? { color: folderColor } : undefined}>
            {node.name}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

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

        <div className="space-y-0.5">
          {folderTree.map((node) => renderFolderNode(node))}
          {uniqueFolders.length === 0 && !isCreating && (
            <p className="px-3 py-2 text-xs text-slate-500">No folders yet</p>
          )}
        </div>
      </div>
      <StorageQuota userId={userId} />

      {editingFolder && (
        <FolderSettingsModal
          folderName={editingFolder}
          currentIcon={folderSettings[editingFolder]?.icon}
          currentColor={folderSettings[editingFolder]?.color}
          onSave={(icon, color) => saveFolderSettings(editingFolder, icon, color)}
          onClose={() => setEditingFolder(null)}
        />
      )}
    </aside>
  );
}
