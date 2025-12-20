"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/lib/types";

interface ActivityListProps {
  userId: string;
}

export default function ActivityList({ userId }: ActivityListProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Failed to fetch activities:", error);
      } else {
        setActivities(data ?? []);
      }
      setLoading(false);
    }
    fetchActivities();
  }, [userId]);

  function getActionIcon(action: string) {
    switch (action) {
      case "upload": return "⬆️";
      case "download": return "⬇️";
      case "delete": return "🗑️";
      case "rename": return "✏️";
      case "move": return "📁";
      case "share": return "🔗";
      case "star": return "⭐";
      case "unstar": return "☆";
      case "trash": return "🗑️";
      case "restore": return "♻️";
      default: return "📄";
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-2">📋</div>
        <p>No activity recorded yet.</p>
        <p className="text-sm mt-1">Your file actions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700"
        >
          <span className="text-xl">{getActionIcon(activity.action)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white">
              <span className="capitalize">{activity.action}</span>
              {activity.entity_name && (
                <span className="text-slate-400"> "{activity.entity_name}"</span>
              )}
            </p>
            <p className="text-xs text-slate-500">{activity.entity_type}</p>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatTime(activity.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
