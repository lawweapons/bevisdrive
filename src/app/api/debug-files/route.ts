import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: files, error } = await supabase
    .from("files")
    .select("id, original_name, folder, path")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("owner_id", user.id);

  return NextResponse.json({ 
    files: files?.map(f => ({ 
      name: f.original_name, 
      folder: f.folder,
      path: f.path 
    })),
    folders: folders?.map(f => ({ name: f.name, path: f.path }))
  });
}
