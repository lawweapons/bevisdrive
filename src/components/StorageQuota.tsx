"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatFileSize } from "@/lib/utils";

interface StorageQuotaProps {
  userId: string;
}

const MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB default limit

export default function StorageQuota({ userId }: StorageQuotaProps) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("files")
        .select("size")
        .eq("owner_id", userId)
        .or("is_trashed.is.null,is_trashed.eq.false");
      
      const total = (data ?? []).reduce((sum, f) => sum + (f.size || 0), 0);
      setUsed(total);
      setLoading(false);
    }
    fetchUsage();
  }, [userId]);

  const percentage = Math.min((used / MAX_STORAGE) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  if (loading) return null;

  return (
    <div className="p-3 border-t border-slate-700">
      <div className="text-xs text-slate-500 mb-1">Storage</div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {formatFileSize(used)} of {formatFileSize(MAX_STORAGE)} used
      </div>
    </div>
  );
}
