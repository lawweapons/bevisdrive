"use client";

import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStoragePath } from "@/lib/utils";
import type { UploadingFile } from "@/lib/types";

interface UploadZoneProps {
  userId: string;
  currentFolder: string;
  onUploadComplete: () => void;
}

export default function UploadZone({
  userId,
  currentFolder,
  onUploadComplete,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const newUploads: UploadingFile[] = fileArray.map((file) => ({
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
            currentFolder,
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
            folder: currentFolder,
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
    [userId, currentFolder, onUploadComplete]
  );

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
      handleFiles(e.dataTransfer.files);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(e.target.files);
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
