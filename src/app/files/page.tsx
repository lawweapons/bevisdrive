import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import FileBrowser from "@/components/FileBrowser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FilesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth");
  }

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const folders = Array.from(
    new Set((files ?? []).map((f) => f.folder).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader email={user.email} />
      <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
        <FileBrowser
          userId={user.id}
          initialFiles={files ?? []}
          initialFolders={folders}
        />
      </Suspense>
    </div>
  );
}
