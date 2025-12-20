"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatFileSize, formatDateTime, getMimeIcon } from "@/lib/utils";
import type { FileRecord } from "@/lib/types";

interface FileListProps {
  files: FileRecord[];
  folders: string[];
  onRefresh: () => void;
  viewMode?: "list" | "grid";
  onViewModeChange?: (mode: "list" | "grid") => void;
}

export default function FileList({ files, folders, onRefresh, viewMode = "list", onViewModeChange }: FileListProps) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveFolder, setMoveFolder] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "size" | "date" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingId || movingId) return;
      
      if (e.key === "Escape") {
        setSelectedFiles(new Set());
        setPreviewFile(null);
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedFiles(new Set(files.map(f => f.id)));
      }
      if (e.key === "Delete" && selectedFiles.size > 0) {
        handleBulkDelete();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [files, selectedFiles, editingId, movingId]);

  // Sort files
  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.original_name.localeCompare(b.original_name);
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "type":
        comparison = a.mime_type.localeCompare(b.mime_type);
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  function toggleSort(field: "name" | "size" | "date" | "type") {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function toggleSelect(fileId: string, e?: React.MouseEvent) {
    const newSelected = new Set(selectedFiles);
    if (e?.shiftKey && selectedFiles.size > 0) {
      const fileIds = sortedFiles.map(f => f.id);
      const lastSelected = Array.from(selectedFiles).pop()!;
      const lastIdx = fileIds.indexOf(lastSelected);
      const currentIdx = fileIds.indexOf(fileId);
      const [start, end] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
      for (let i = start; i <= end; i++) {
        newSelected.add(fileIds[i]);
      }
    } else if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  }

  function selectAll() {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;
    
    const supabase = createSupabaseBrowserClient();
    const filesToDelete = files.filter(f => selectedFiles.has(f.id));
    
    for (const file of filesToDelete) {
      await supabase.storage.from(file.bucket).remove([file.path]);
      await supabase.from("files").delete().eq("id", file.id);
    }
    
    setSelectedFiles(new Set());
    onRefresh();
  }

  async function handleBulkMove(targetFolder: string) {
    if (selectedFiles.size === 0) return;
    
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const filesToMove = files.filter(f => selectedFiles.has(f.id));
    
    for (const file of filesToMove) {
      const fileName = file.path.split("/").pop()!;
      const newPath = targetFolder
        ? `${userData.user.id}/${targetFolder}/${fileName}`
        : `${userData.user.id}/${fileName}`;
      
      await supabase.storage.from(file.bucket).move(file.path, newPath);
      await supabase.from("files").update({ path: newPath, folder: targetFolder }).eq("id", file.id);
    }
    
    setSelectedFiles(new Set());
    onRefresh();
  }

  async function handleToggleStar(file: FileRecord) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("files").update({ is_starred: !file.is_starred }).eq("id", file.id);
    onRefresh();
  }

  async function handleMoveToTrash(file: FileRecord) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("files").update({ 
      is_trashed: true, 
      trashed_at: new Date().toISOString() 
    }).eq("id", file.id);
    setActiveMenu(null);
    onRefresh();
  }

  async function openPreview(file: FileRecord) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 300);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewFile(file);
    }
  }

  function canPreview(mimeType: string) {
    return mimeType.startsWith("image/") || 
           mimeType === "application/pdf" || 
           mimeType.startsWith("video/") ||
           mimeType.startsWith("audio/");
  }

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
    <div ref={containerRef} className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedFiles.size > 0 ? (
            <>
              <span className="text-sm text-slate-400">{selectedFiles.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
              >
                Delete
              </button>
              <select
                onChange={(e) => { if (e.target.value) handleBulkMove(e.target.value); e.target.value = ""; }}
                className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                <option value="">Root</option>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-500">{files.length} files</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-") as ["name" | "size" | "date" | "type", "asc" | "desc"];
              setSortBy(field);
              setSortDir(dir);
            }}
            className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest first</option>
            <option value="size-asc">Smallest first</option>
            <option value="type-asc">Type A-Z</option>
          </select>
          <div className="flex rounded border border-slate-600 overflow-hidden">
            <button
              onClick={() => onViewModeChange?.("list")}
              className={`px-2 py-1 text-xs ${viewMode === "list" ? "bg-slate-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
              title="List view"
            >
              ☰
            </button>
            <button
              onClick={() => onViewModeChange?.("grid")}
              className={`px-2 py-1 text-xs ${viewMode === "grid" ? "bg-slate-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* File list or grid */}
      {viewMode === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600 text-left text-slate-400">
                <th className="pb-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={selectAll}
                    className="rounded border-slate-500"
                  />
                </th>
                <th className="pb-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("name")}>
                  Name {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="pb-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("size")}>
                  Size {sortBy === "size" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="pb-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("type")}>
                  Type {sortBy === "type" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="pb-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("date")}>
                  Uploaded {sortBy === "date" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="pb-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file) => (
                <tr
                  key={file.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("fileId", file.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuPosition({ top: e.clientY, left: e.clientX });
                    setActiveMenu(file.id);
                  }}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                      toggleSelect(file.id, e);
                    }
                  }}
                  onDoubleClick={() => canPreview(file.mime_type) && openPreview(file)}
                  className={`border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer ${
                    selectedFiles.has(file.id) ? "bg-blue-900/30" : ""
                  }`}
                >
                  <td className="py-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-500"
                    />
                  </td>
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
                        <button onClick={() => handleRename(file)} className="text-green-500">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400">✗</button>
                      </div>
                    ) : movingId === file.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={moveFolder}
                          onChange={(e) => setMoveFolder(e.target.value)}
                          className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white"
                        >
                          <option value="">Root</option>
                          {folders.filter(f => f !== file.folder).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button onClick={() => handleMove(file)} className="text-green-500">✓</button>
                        <button onClick={() => setMovingId(null)} className="text-slate-400">✗</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStar(file); }}
                          className={`text-sm ${file.is_starred ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400"}`}
                        >
                          ★
                        </button>
                        <span>{getMimeIcon(file.mime_type)}</span>
                        <span className="font-medium text-white">{file.original_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-slate-400">{formatFileSize(file.size)}</td>
                  <td className="py-3 text-slate-400">{file.mime_type.split("/")[1] || file.mime_type}</td>
                  <td className="py-3 text-slate-400">{formatDateTime(file.created_at)}</td>
                  <td className="py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openMenu(file.id, e.currentTarget); }}
                      className="rounded p-1 hover:bg-slate-700 text-slate-300"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedFiles.map((file) => (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("fileId", file.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuPosition({ top: e.clientY, left: e.clientX });
                setActiveMenu(file.id);
              }}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  toggleSelect(file.id, e);
                }
              }}
              onDoubleClick={() => canPreview(file.mime_type) && openPreview(file)}
              className={`relative group rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedFiles.has(file.id)
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-slate-700 hover:border-slate-600 hover:bg-slate-700/30"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                onChange={() => toggleSelect(file.id)}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 left-2 rounded border-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleStar(file); }}
                className={`absolute top-2 right-2 ${file.is_starred ? "text-yellow-400" : "text-slate-600 opacity-0 group-hover:opacity-100"}`}
              >
                ★
              </button>
              <div className="text-4xl text-center mb-2">{getMimeIcon(file.mime_type)}</div>
              <p className="text-sm text-white truncate text-center">{file.original_name}</p>
              <p className="text-xs text-slate-500 text-center">{formatFileSize(file.size)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {activeMenu && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 w-40 rounded-md border border-slate-600 bg-slate-800 py-1 shadow-lg"
          style={{ top: menuPosition.top, left: Math.min(menuPosition.left, window.innerWidth - 170) }}
        >
          {(() => {
            const file = files.find((f) => f.id === activeMenu);
            if (!file) return null;
            return (
              <>
                {canPreview(file.mime_type) && (
                  <button
                    onClick={() => { openPreview(file); setActiveMenu(null); }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <span>👁</span> Preview
                  </button>
                )}
                <button
                  onClick={() => handleDownload(file)}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>⬇</span> Download
                </button>
                <button
                  onClick={() => { handleToggleStar(file); setActiveMenu(null); }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>{file.is_starred ? "★" : "☆"}</span> {file.is_starred ? "Unstar" : "Star"}
                </button>
                <hr className="my-1 border-slate-600" />
                <button
                  onClick={() => {
                    setEditName(file.original_name);
                    setEditingId(file.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>✏</span> Rename
                </button>
                <button
                  onClick={() => {
                    setMoveFolder(file.folder);
                    setMovingId(file.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>📁</span> Move
                </button>
                <button
                  onClick={() => {
                    router.push(`/files?share=${file.id}`);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>🔗</span> Share
                </button>
                <hr className="my-1 border-slate-600" />
                <button
                  onClick={() => handleMoveToTrash(file)}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                >
                  <span>🗑</span> Move to Trash
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-slate-300"
            >
              ✕
            </button>
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <span className="text-white font-medium truncate">{previewFile.original_name}</span>
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Download
                </button>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
                {previewFile.mime_type.startsWith("image/") && (
                  <img src={previewUrl} alt={previewFile.original_name} className="max-w-full max-h-full object-contain" />
                )}
                {previewFile.mime_type === "application/pdf" && (
                  <iframe src={previewUrl} className="w-full h-[70vh]" title={previewFile.original_name} />
                )}
                {previewFile.mime_type.startsWith("video/") && (
                  <video src={previewUrl} controls className="max-w-full max-h-full" />
                )}
                {previewFile.mime_type.startsWith("audio/") && (
                  <audio src={previewUrl} controls className="w-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
