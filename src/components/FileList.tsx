"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatFileSize, formatDateTime, getMimeIcon } from "@/lib/utils";
import type { FileRecord } from "@/lib/types";

interface FileListProps {
  files: FileRecord[];
  folders: string[];
  onRefresh: () => void;
}

export default function FileList({ files, folders, onRefresh }: FileListProps) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveFolder, setMoveFolder] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openMenu(fileId: string, buttonElement: HTMLButtonElement) {
    if (activeMenu === fileId) {
      setActiveMenu(null);
      return;
    }
    const rect = buttonElement.getBoundingClientRect();
    const menuHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top: number;
    if (spaceBelow >= menuHeight) {
      top = rect.bottom + 4;
    } else if (spaceAbove >= menuHeight) {
      top = rect.top - menuHeight - 4;
    } else {
      top = Math.max(8, Math.min(window.innerHeight - menuHeight - 8, rect.top - menuHeight / 2));
    }
    
    setMenuPosition({ top, left: rect.right - 144 });
    setActiveMenu(fileId);
  }

  async function handleDelete(file: FileRecord) {
    if (!confirm(`Delete "${file.original_name}"?`)) return;

    const supabase = createSupabaseBrowserClient();

    const { error: storageError } = await supabase.storage
      .from(file.bucket)
      .remove([file.path]);

    if (storageError) {
      alert(`Failed to delete file: ${storageError.message}`);
      return;
    }

    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id);

    if (dbError) {
      alert(`Failed to delete record: ${dbError.message}`);
      return;
    }

    setActiveMenu(null);
    onRefresh();
  }

  async function handleRename(file: FileRecord) {
    if (!editName.trim() || editName === file.original_name) {
      setEditingId(null);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase
      .from("files")
      .update({ original_name: editName.trim() })
      .eq("id", file.id);

    if (error) {
      alert(`Failed to rename: ${error.message}`);
      return;
    }

    setEditingId(null);
    onRefresh();
  }

  async function handleMove(file: FileRecord) {
    const newFolder = moveFolder.trim().replace(/^\/+|\/+$/g, "");
    if (newFolder === file.folder) {
      setMovingId(null);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const oldPath = file.path;
    const fileName = oldPath.split("/").pop()!;
    const newPath = newFolder
      ? `${userData.user.id}/${newFolder}/${fileName}`
      : `${userData.user.id}/${fileName}`;

    const { error: moveError } = await supabase.storage
      .from(file.bucket)
      .move(oldPath, newPath);

    if (moveError) {
      alert(`Failed to move file: ${moveError.message}`);
      return;
    }

    const { error: dbError } = await supabase
      .from("files")
      .update({ path: newPath, folder: newFolder })
      .eq("id", file.id);

    if (dbError) {
      alert(`Failed to update record: ${dbError.message}`);
      return;
    }

    setMovingId(null);
    onRefresh();
  }

  async function handleDownload(file: FileRecord) {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 60);

    if (error || !data?.signedUrl) {
      alert(`Failed to get download link: ${error?.message}`);
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = file.original_name;
    link.click();
    setActiveMenu(null);
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-2">📭</div>
        <p>No files yet. Upload some files to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-600 text-left text-slate-400">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Size</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Uploaded</th>
            <th className="pb-3 font-medium">Tags</th>
            <th className="pb-3 font-medium w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("fileId", file.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="border-b border-slate-700 hover:bg-slate-700/50 cursor-grab active:cursor-grabbing"
            >
              <td className="py-3">
                {editingId === file.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(file);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(file)}
                      className="text-green-600 hover:text-green-700"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      ✗
                    </button>
                  </div>
                ) : movingId === file.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Move to:</span>
                    <select
                      value={moveFolder}
                      onChange={(e) => setMoveFolder(e.target.value)}
                      className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white"
                      autoFocus
                    >
                      <option value="">Root (no folder)</option>
                      {folders.filter(f => f !== file.folder).map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleMove(file)}
                      className="text-green-600 hover:text-green-700"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setMovingId(null)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{getMimeIcon(file.mime_type)}</span>
                    <span className="font-medium text-white">
                      {file.original_name}
                    </span>
                  </div>
                )}
              </td>
              <td className="py-3 text-slate-400">{formatFileSize(file.size)}</td>
              <td className="py-3 text-slate-400">
                {file.mime_type.split("/")[1] || file.mime_type}
              </td>
              <td className="py-3 text-slate-400">
                {formatDateTime(file.created_at)}
              </td>
              <td className="py-3">
                {file.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {file.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block rounded bg-slate-600 px-2 py-0.5 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="py-3">
                <button
                  onClick={(e) => openMenu(file.id, e.currentTarget)}
                  className="rounded p-1 hover:bg-slate-700 text-slate-300"
                >
                  ⋮
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeMenu && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 w-36 rounded-md border border-slate-600 bg-slate-800 py-1 shadow-lg"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {(() => {
            const file = files.find((f) => f.id === activeMenu);
            if (!file) return null;
            return (
              <>
                <button
                  onClick={() => handleDownload(file)}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    setEditName(file.original_name);
                    setEditingId(file.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setMoveFolder(file.folder);
                    setMovingId(file.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                >
                  Move
                </button>
                <button
                  onClick={() => {
                    router.push(`/files?share=${file.id}`);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                >
                  Share
                </button>
                <hr className="my-1 border-slate-600" />
                <button
                  onClick={() => handleDelete(file)}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
