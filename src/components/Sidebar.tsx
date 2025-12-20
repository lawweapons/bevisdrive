"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StorageQuota from "./StorageQuota";
import FolderSettingsModal from "./FolderSettingsModal";
import ShareFolderModal from "./ShareFolderModal";
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
  const [sharingFolder, setSharingFolder] = useState<string | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
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

  const uniqueFolders = Array.from(new Set(folders)).filter(Boolean);
  
  // Load folder order from localStorage
  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bevisdrive-folder-order");
      if (saved) {
        setFolderOrder(JSON.parse(saved));
      }
    }
  });
  
  // Sort folders by custom order, then alphabetically
  const sortedFolders = [...uniqueFolders].sort((a, b) => {
    const aIndex = folderOrder.indexOf(a);
    const bIndex = folderOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

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

  const folderTree = buildFolderTree(sortedFolders);
  
  function handleFolderDrop(draggedPath: string, targetPath: string) {
    if (draggedPath === targetPath) return;
    
    const newOrder = [...sortedFolders];
    const draggedIndex = newOrder.indexOf(draggedPath);
    const targetIndex = newOrder.indexOf(targetPath);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove dragged item and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPath);
    
    setFolderOrder(newOrder);
    localStorage.setItem("bevisdrive-folder-order", JSON.stringify(newOrder));
    setDraggingFolder(null);
  }
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
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggingFolder(node.path);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => setDraggingFolder(null)}
          onClick={() => navigateTo("folder", node.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            setFolderContextMenu({ path: node.path, x: e.clientX, y: e.clientY });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            const folderDrag = e.dataTransfer.types.includes("text/plain");
            if (draggingFolder && draggingFolder !== node.path) {
              setDragOverFolder(node.path);
            } else if (!folderDrag) {
              setDragOverFolder(node.path);
            }
          }}
          onDragLeave={() => setDragOverFolder(null)}
          onDrop={(e) => {
            e.preventDefault();
            const fileId = e.dataTransfer.getData("fileId");
            
            if (draggingFolder && draggingFolder !== node.path) {
              // Reorder folders
              handleFolderDrop(draggingFolder, node.path);
            } else if (fileId && onFileDrop) {
              // Move file to folder
              onFileDrop(fileId, node.path);
            }
            setDragOverFolder(null);
          }}
          className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors cursor-move ${
            draggingFolder === node.path
              ? "opacity-50"
              : isDragOver && draggingFolder
              ? "border-t-2 border-t-blue-500"
              : isDragOver
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

      {/* Folder context menu */}
      {folderContextMenu && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ top: folderContextMenu.y, left: folderContextMenu.x }}
          onClick={() => setFolderContextMenu(null)}
        >
          <button
            onClick={() => {
              setEditingFolder(folderContextMenu.path);
              setFolderContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            <span>🎨</span> Customize
          </button>
          <button
            onClick={() => {
              setSharingFolder(folderContextMenu.path);
              setFolderContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            <span>🔗</span> Share Folder
          </button>
        </div>
      )}

      {editingFolder && (
        <FolderSettingsModal
          folderName={editingFolder}
          currentIcon={folderSettings[editingFolder]?.icon}
          currentColor={folderSettings[editingFolder]?.color}
          onSave={(icon, color) => saveFolderSettings(editingFolder, icon, color)}
          onClose={() => setEditingFolder(null)}
        />
      )}

      {sharingFolder && (
        <ShareFolderModal
          folderName={sharingFolder}
          userId={userId}
          onClose={() => setSharingFolder(null)}
        />
      )}
    </aside>
  );
}
