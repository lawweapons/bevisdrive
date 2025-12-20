"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import FileBrowser from "./FileBrowser";
import type { FileRecord } from "@/lib/types";

interface FilesPageClientProps {
  email: string;
  userId: string;
  initialFiles: FileRecord[];
  initialFolders: string[];
}

export default function FilesPageClient({ email, userId, initialFiles, initialFolders }: FilesPageClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <AppHeader email={email} onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      <FileBrowser
        userId={userId}
        initialFiles={initialFiles}
        initialFolders={initialFolders}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
    </>
  );
}
