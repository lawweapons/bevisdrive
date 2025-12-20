"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatFileSize, formatDateTime } from "@/lib/utils";

interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  path: string;
  size: number;
  created_at: string;
  created_by: string;
}

interface FileVersionHistoryProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}

export default function FileVersionHistory({
  fileId,
  fileName,
  onClose,
  onRestore,
}: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersions() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("file_versions")
        .select("*")
        .eq("file_id", fileId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Failed to fetch versions:", error);
      } else {
        setVersions(data ?? []);
      }
      setLoading(false);
    }
    fetchVersions();
  }, [fileId]);

  async function handleDownload(version: FileVersion) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from("files")
      .createSignedUrl(version.path, 60);

    if (error || !data?.signedUrl) {
      alert(`Failed to download: ${error?.message}`);
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = `${fileName} (v${version.version_number})`;
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-slate-800 border border-slate-700 p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Version History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="rounded-md bg-slate-700 p-3 mb-4">
          <p className="text-sm font-medium text-white truncate">{fileName}</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>No version history available</p>
            <p className="text-xs mt-1">Versions are created when you upload a file with the same name</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between bg-slate-700 rounded-lg p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      Version {version.version_number}
                    </span>
                    {version.version_number === versions[0].version_number && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDateTime(version.created_at)} • {formatFileSize(version.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(version)}
                    className="rounded bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-500"
                  >
                    Download
                  </button>
                  {version.version_number !== versions[0].version_number && (
                    <button
                      onClick={() => {
                        if (confirm(`Restore to version ${version.version_number}?`)) {
                          onRestore(version.id);
                        }
                      }}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
