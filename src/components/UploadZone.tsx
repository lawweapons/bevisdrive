"use client";

import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStoragePath } from "@/lib/utils";
import type { UploadingFile } from "@/lib/types";

interface UploadZoneProps {
  userId: string;
  currentFolder: string;
  folders: string[];
  onUploadComplete: () => void;
}

export default function UploadZone({
  userId,
  currentFolder,
  folders,
  onUploadComplete,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(currentFolder);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[], targetFolder: string) => {
      if (files.length === 0) return;

      const newUploads: UploadingFile[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      const supabase = createSupabaseBrowserClient();

      for (const upload of newUploads) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, status: "uploading" as const } : u
          )
        );

        try {
          const storagePath = buildStoragePath(
            userId,
            targetFolder,
            upload.file.name
          );

          const { error: uploadError } = await supabase.storage
            .from("user-files")
            .upload(storagePath, upload.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase.from("files").insert({
            owner_id: userId,
            bucket: "user-files",
            path: storagePath,
            original_name: upload.file.name,
            size: upload.file.size,
            mime_type: upload.file.type || "application/octet-stream",
            folder: targetFolder,
          });

          if (dbError) throw dbError;

          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? { ...u, progress: 100, status: "done" as const }
                : u
            )
          );
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? {
                    ...u,
                    status: "error" as const,
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : u
            )
          );
        }
      }

      onUploadComplete();

      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status !== "done"));
      }, 3000);
    },
    [userId, onUploadComplete]
  );

  function handleFilesSelected(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    setPendingFiles(fileArray);
    setSelectedFolder(currentFolder);
    setShowUploadOptions(true);
  }

  function confirmUpload() {
    uploadFiles(pendingFiles, selectedFolder);
    setPendingFiles([]);
    setShowUploadOptions(false);
  }

  function cancelUpload() {
    setPendingFiles([]);
    setShowUploadOptions(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFilesSelected(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-slate-700"
            : "border-slate-600 hover:border-slate-500"
        }`}
      >
        <div className="text-4xl mb-2">📤</div>
        <p className="text-sm text-slate-400 mb-3">
          Drag and drop files here, or
        </p>
        <label className="inline-block cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          Select files
          <input
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {showUploadOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Upload Options</h2>
            
            <div className="mb-4">
              <p className="text-sm text-slate-300 mb-2">
                {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} selected:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {pendingFiles.map((file, i) => (
                  <p key={i} className="text-sm text-slate-400 truncate">
                    • {file.name}
                  </p>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload to folder
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="">All files (no folder)</option>
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelUpload}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 rounded-md border border-slate-600 bg-slate-700 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {upload.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {upload.status === "pending" && "Waiting..."}
                  {upload.status === "uploading" && "Uploading..."}
                  {upload.status === "done" && "✓ Complete"}
                  {upload.status === "error" && `✗ ${upload.error}`}
                </p>
              </div>
              {upload.status === "uploading" && (
                <div className="w-20 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === "done" && (
                <span className="text-green-600">✓</span>
              )}
              {upload.status === "error" && (
                <span className="text-red-600">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
