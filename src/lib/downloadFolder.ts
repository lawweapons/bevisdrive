import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createSupabaseBrowserClient } from "./supabase/client";
import type { FileRecord } from "./types";

export async function downloadFolderAsZip(
  folderName: string,
  files: FileRecord[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();
  const supabase = createSupabaseBrowserClient();
  
  const folderFiles = files.filter((f) => f.folder === folderName);
  
  if (folderFiles.length === 0) {
    throw new Error("No files in this folder");
  }

  let completed = 0;
  
  for (const file of folderFiles) {
    try {
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .download(file.path);
      
      if (error) {
        console.error(`Failed to download ${file.original_name}:`, error);
        continue;
      }
      
      zip.file(file.original_name, data);
      completed++;
      onProgress?.(Math.round((completed / folderFiles.length) * 100));
    } catch (err) {
      console.error(`Error downloading ${file.original_name}:`, err);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${folderName.replace(/\//g, "-")}.zip`);
}

export async function downloadSelectedFilesAsZip(
  files: FileRecord[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();
  const supabase = createSupabaseBrowserClient();
  
  if (files.length === 0) {
    throw new Error("No files selected");
  }

  let completed = 0;
  
  for (const file of files) {
    try {
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .download(file.path);
      
      if (error) {
        console.error(`Failed to download ${file.original_name}:`, error);
        continue;
      }
      
      zip.file(file.original_name, data);
      completed++;
      onProgress?.(Math.round((completed / files.length) * 100));
    } catch (err) {
      console.error(`Error downloading ${file.original_name}:`, err);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `bevisdrive-files.zip`);
}
