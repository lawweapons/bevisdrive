export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getMimeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
  return "📁";
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function buildStoragePath(
  userId: string,
  folder: string,
  originalName: string,
): string {
  const uuid = generateUUID();
  const ext = getFileExtension(originalName);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = ext ? `${uuid}-${safeName}` : `${uuid}-${safeName}`;
  
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  if (cleanFolder) {
    return `${userId}/${cleanFolder}/${fileName}`;
  }
  return `${userId}/${fileName}`;
}
