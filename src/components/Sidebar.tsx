"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SidebarProps {
  folders: string[];
  currentFolder: string;
}

export default function Sidebar({ folders, currentFolder }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") ?? "all";

  function navigateTo(newView: string, folder?: string) {
    const params = new URLSearchParams();
    params.set("view", newView);
    if (folder) {
      params.set("folder", folder);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const navItems = [
    { id: "all", label: "All files", icon: "📁" },
    { id: "recent", label: "Recent", icon: "🕐" },
    { id: "shared", label: "Shared", icon: "🔗" },
  ];

  const uniqueFolders = Array.from(new Set(folders)).filter(Boolean).sort();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-700 bg-slate-800">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              view === item.id && !searchParams.get("folder")
                ? "bg-slate-700 text-white font-medium"
                : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {uniqueFolders.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3 mb-2">
            Folders
          </div>
          <div className="space-y-1">
            {uniqueFolders.map((folder) => (
              <button
                key={folder}
                onClick={() => navigateTo("folder", folder)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  currentFolder === folder
                    ? "bg-slate-700 text-white font-medium"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                }`}
              >
                <span>📂</span>
                <span className="truncate">{folder || "Root"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
