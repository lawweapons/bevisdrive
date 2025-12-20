"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ShareFolderModalProps {
  folderName: string;
  userId: string;
  onClose: () => void;
}

export default function ShareFolderModal({ folderName, userId, onClose }: ShareFolderModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [expiresIn, setExpiresIn] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (!enabled) {
        // Remove folder share
        await supabase
          .from("folder_shares")
          .delete()
          .eq("owner_id", userId)
          .eq("folder_name", folderName);
        setShareUrl("");
        onClose();
        return;
      }

      const linkToken = crypto.randomUUID();
      
      let expiresAt: string | null = null;
      if (expiresIn) {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expiresIn, 10));
        expiresAt = date.toISOString();
      }

      const { error } = await supabase.from("folder_shares").upsert({
        owner_id: userId,
        folder_name: folderName,
        link_token: linkToken,
        expires_at: expiresAt,
      }, { onConflict: "owner_id,folder_name" });

      if (error) throw error;

      setShareUrl(`${window.location.origin}/folder/${linkToken}`);
      alert("Folder share link created!");
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }

  function copyLink() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Share Folder</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="rounded-md bg-slate-700 p-3 mb-4">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <span>📂</span>
            <span className="truncate">{folderName}</span>
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-700"
            />
            <span className="text-sm text-slate-300">
              Public folder link enabled
            </span>
          </label>

          {enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Expires in (optional)
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                >
                  <option value="">Never</option>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              {shareUrl && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Share link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={copyLink}
                      className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-slate-500">
            Anyone with the link can view all files in this folder.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
