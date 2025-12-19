"use client";

import { useState } from "react";
import { formatFileSize } from "@/lib/utils";

interface ShareDownloadProps {
  token: string;
  fileName: string;
  fileSize: number;
  hasPassword: boolean;
}

export default function ShareDownload({
  token,
  fileName,
  fileSize,
  hasPassword,
}: ShareDownloadProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(e?: React.FormEvent) {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/share/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: hasPassword ? password : undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Download failed");
        return;
      }

      if (data.signedUrl) {
        window.location.href = data.signedUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📥</div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Download file
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Someone shared a file with you
          </p>
        </div>

        <div className="rounded-md bg-zinc-50 p-4 mb-6">
          <p className="font-medium text-zinc-900 truncate">{fileName}</p>
          <p className="text-sm text-zinc-500 mt-1">{formatFileSize(fileSize)}</p>
        </div>

        {hasPassword ? (
          <form onSubmit={handleDownload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Password required
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isLoading ? "Verifying..." : "Download"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={() => handleDownload()}
              disabled={isLoading}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isLoading ? "Preparing..." : "Download"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          Powered by BevisDrive
        </p>
      </div>
    </div>
  );
}
