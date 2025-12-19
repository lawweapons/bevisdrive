"use client";

import { useRouter, usePathname } from "next/navigation";

interface BreadcrumbsProps {
  folder: string;
}

export default function Breadcrumbs({ folder }: BreadcrumbsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const parts = folder.split("/").filter(Boolean);

  function navigateToFolder(index: number) {
    if (index < 0) {
      router.push(pathname);
      return;
    }
    const targetFolder = parts.slice(0, index + 1).join("/");
    router.push(`${pathname}?view=folder&folder=${encodeURIComponent(targetFolder)}`);
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-400">
      <button
        onClick={() => navigateToFolder(-1)}
        className="hover:text-white hover:underline"
      >
        Home
      </button>
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          <span className="text-slate-500">/</span>
          <button
            onClick={() => navigateToFolder(index)}
            className={`hover:text-white hover:underline ${
              index === parts.length - 1 ? "text-white font-medium" : ""
            }`}
          >
            {part}
          </button>
        </span>
      ))}
    </nav>
  );
}
