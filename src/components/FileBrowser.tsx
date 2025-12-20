"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FileRecord } from "@/lib/types";
import Sidebar from "./Sidebar";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar";
import UploadZone from "./UploadZone";
import FileList from "./FileList";
import ShareModal from "./ShareModal";

interface FileBrowserProps {
  userId: string;
  initialFiles: FileRecord[];
  initialFolders: string[];
}

export default function FileBrowser({
  userId,
  initialFiles,
  initialFolders,
}: FileBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") ?? "all";
  const currentFolder = searchParams.get("folder") ?? "";

  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [folders, setFolders] = useState<string[]>(initialFolders);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const fetchFolders = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("folders")
      .select("name")
      .eq("owner_id", userId)
      .order("name");
    
    if (error) {
      console.error("Failed to fetch folders:", error);
      return;
    }
    
    const dbFolders = (data ?? []).map((f) => f.name);
    setFolders(dbFolders);
  }, [userId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const fetchFiles = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    let query = supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    // Filter out trashed files by default (except in trash view)
    if (view !== "trash") {
      query = query.or("is_trashed.is.null,is_trashed.eq.false");
    }

    if (view === "folder" && currentFolder) {
      query = query.eq("folder", currentFolder);
    } else if (view === "shared") {
      query = query.eq("is_public", true);
    } else if (view === "recent") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte("created_at", sevenDaysAgo.toISOString());
    } else if (view === "starred") {
      query = query.eq("is_starred", true);
    } else if (view === "trash") {
      query = query.eq("is_trashed", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch files:", error);
      return;
    }

    if (view === "duplicates") {
      const duplicates = findDuplicates(data ?? []);
      setFiles(duplicates);
    } else {
      setFiles(data ?? []);
    }

  }, [userId, view, currentFolder, initialFolders]);

  function findDuplicates(fileList: FileRecord[]): FileRecord[] {
    const seen = new Map<string, FileRecord[]>();
    fileList.forEach((file) => {
      const key = `${file.original_name}-${file.size}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(file);
    });
    const duplicates: FileRecord[] = [];
    seen.forEach((files) => {
      if (files.length > 1) {
        duplicates.push(...files);
      }
    });
    return duplicates;
  }

  useEffect(() => {
    if (!isSearching) {
      fetchFiles();
    }
  }, [fetchFiles, isSearching]);

  async function handleSearch(
    query: string,
    filters: { type?: string; folder?: string }
  ) {
    if (!query && !filters.type && !filters.folder) {
      setIsSearching(false);
      setSearchQuery("");
      fetchFiles();
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    const supabase = createSupabaseBrowserClient();

    let searchQuery = supabase
      .from("files")
      .select("*")
      .eq("owner_id", userId);

    if (query) {
      searchQuery = searchQuery.textSearch("search_vector", query, {
        type: "websearch",
        config: "simple",
      });
    }

    if (filters.type) {
      searchQuery = searchQuery.ilike("mime_type", `%${filters.type}%`);
    }

    if (filters.folder) {
      searchQuery = searchQuery.eq("folder", filters.folder);
    }

    const { data, error } = await searchQuery.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Search failed:", error);
      return;
    }

    setFiles(data ?? []);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <Sidebar 
        folders={folders} 
        currentFolder={currentFolder} 
        onFolderCreated={async (folderName) => {
          setFolders((prev) => Array.from(new Set([...prev, folderName])).sort());
          
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase
            .from("folders")
            .upsert({ owner_id: userId, name: folderName }, { onConflict: "owner_id,name" });
          
          if (error) {
            console.error("Failed to create folder:", error);
            alert(`Failed to save folder: ${error.message}`);
            fetchFolders();
            return;
          }
        }}
        onFileDrop={async (fileId, targetFolder) => {
          const file = files.find((f) => f.id === fileId);
          if (!file || file.folder === targetFolder) return;

          const supabase = createSupabaseBrowserClient();
          const oldPath = file.path;
          const fileName = oldPath.split("/").pop()!;
          const newPath = targetFolder
            ? `${userId}/${targetFolder}/${fileName}`
            : `${userId}/${fileName}`;

          const { error: moveError } = await supabase.storage
            .from(file.bucket)
            .move(oldPath, newPath);

          if (moveError) {
            alert(`Failed to move file: ${moveError.message}`);
            return;
          }

          const { error: dbError } = await supabase
            .from("files")
            .update({ path: newPath, folder: targetFolder })
            .eq("id", fileId);

          if (dbError) {
            alert(`Failed to update record: ${dbError.message}`);
            return;
          }

          fetchFiles();
        }}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {view === "all" && "All files"}
                {view === "recent" && "Recent files"}
                {view === "starred" && "⭐ Starred files"}
                {view === "shared" && "Shared files"}
                {view === "duplicates" && "Duplicate files"}
                {view === "trash" && "🗑 Trash"}
                {view === "folder" && (currentFolder || "Root")}
              </h1>
              {currentFolder && view === "folder" && (
                <div className="mt-1">
                  <Breadcrumbs folder={currentFolder} />
                </div>
              )}
            </div>
          </div>

          <SearchBar onSearch={handleSearch} folders={folders} />

          {isSearching && (
            <div className="text-sm text-slate-400">
              Showing results for "{searchQuery}"
            </div>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <UploadZone
              userId={userId}
              currentFolder={currentFolder}
              folders={folders}
              onUploadComplete={fetchFiles}
            />
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <FileList 
              files={files} 
              folders={folders} 
              onRefresh={fetchFiles}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </main>

      <ShareModal />
    </div>
  );
}
