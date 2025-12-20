"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FileRecord, FileShare } from "@/lib/types";

export default function ShareModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("share");

  const [file, setFile] = useState<FileRecord | null>(null);
  const [share, setShare] = useState<FileShare | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareWithEmail, setShareWithEmail] = useState("");
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!fileId) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      const supabase = createSupabaseBrowserClient();

      const { data: fileData } = await supabase
        .from("files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (fileData) {
        setFile(fileData);

        const { data: shareData } = await supabase
          .from("file_shares")
          .select("*")
          .eq("file_id", fileId)
          .maybeSingle();

        if (shareData) {
          setShare(shareData);
          setEnabled(true);
          setShareUrl(`${window.location.origin}/s/${shareData.link_token}`);
        }

        // Load shared users
        const { data: userShares } = await supabase
          .from("file_user_shares")
          .select("shared_with_email")
          .eq("file_id", fileId);
        
        if (userShares) {
          setSharedUsers(userShares.map(s => s.shared_with_email));
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, [fileId]);

  function closeModal() {
    router.push("/files");
  }

  async function handleSave() {
    if (!file) return;

    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (!enabled) {
        if (share) {
          await supabase.from("file_shares").delete().eq("id", share.id);
        }
        setShare(null);
        setShareUrl("");
        closeModal();
        return;
      }

      const linkToken = share?.link_token ?? crypto.randomUUID();

      let expiresAt: string | null = null;
      if (expiresIn) {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expiresIn, 10));
        expiresAt = date.toISOString();
      }

      let passwordHash: string | null = null;
      if (password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      const shareData = {
        file_id: file.id,
        link_token: linkToken,
        expires_at: expiresAt,
        password_hash: passwordHash,
      };

      if (share) {
        const { error } = await supabase
          .from("file_shares")
          .update(shareData)
          .eq("id", share.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("file_shares").insert(shareData);
        if (error) throw error;
      }

      setShareUrl(`${window.location.origin}/s/${linkToken}`);
      alert("Share link saved!");
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }

  function copyLink() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  }

  async function handleAddUser() {
    if (!file || !shareWithEmail.trim()) return;
    
    const email = shareWithEmail.trim().toLowerCase();
    if (sharedUsers.includes(email)) {
      alert("Already shared with this user");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("file_user_shares").insert({
      file_id: file.id,
      shared_with_email: email,
    });

    if (error) {
      alert(`Failed to share: ${error.message}`);
      return;
    }

    setSharedUsers([...sharedUsers, email]);
    setShareWithEmail("");
  }

  async function handleRemoveUser(email: string) {
    if (!file) return;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("file_user_shares")
      .delete()
      .eq("file_id", file.id)
      .eq("shared_with_email", email);

    if (error) {
      alert(`Failed to remove: ${error.message}`);
      return;
    }

    setSharedUsers(sharedUsers.filter(u => u !== email));
  }

  if (!fileId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Share file</h2>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading...</div>
        ) : !file ? (
          <div className="py-8 text-center text-slate-400">File not found</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-700 p-3">
              <p className="text-sm font-medium text-white truncate">
                {file.original_name}
              </p>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-700"
              />
              <span className="text-sm text-slate-300">
                Public link enabled
              </span>
            </label>

            {enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Password (optional)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for no password"
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Expires in (optional)
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                    {share?.view_count !== undefined && (
                      <p className="text-xs text-slate-500 mt-2">
                        👁 {share.view_count} view{share.view_count !== 1 ? "s" : ""}
                        {share.expires_at && (
                          <span className="ml-2">
                            • Expires {new Date(share.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="border-t border-slate-700 pt-4 mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Share with specific users
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={shareWithEmail}
                  onChange={(e) => setShareWithEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                  placeholder="Enter email address"
                  className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddUser}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                >
                  Add
                </button>
              </div>
              {sharedUsers.length > 0 && (
                <div className="space-y-1">
                  {sharedUsers.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between bg-slate-700 rounded px-3 py-2"
                    >
                      <span className="text-sm text-white">{email}</span>
                      <button
                        onClick={() => handleRemoveUser(email)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {sharedUsers.length === 0 && (
                <p className="text-xs text-slate-500">Not shared with any specific users yet</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
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
        )}
      </div>
    </div>
  );
}
