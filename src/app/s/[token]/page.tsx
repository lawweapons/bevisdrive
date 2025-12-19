import { createSupabaseServerClient } from "@/lib/supabase/server";
import ShareDownload from "./ShareDownload";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: share, error: shareError } = await supabase
    .from("file_shares")
    .select("*, files(*)")
    .eq("link_token", token)
    .maybeSingle();

  if (shareError || !share) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Link not found
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            This share link doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-semibold text-zinc-900">Link expired</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This share link has expired and is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const file = share.files;
  if (!file) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h1 className="text-xl font-semibold text-zinc-900">File not found</h1>
          <p className="mt-2 text-sm text-zinc-600">
            The file associated with this link no longer exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShareDownload
      token={token}
      fileName={file.original_name}
      fileSize={file.size}
      hasPassword={!!share.password_hash}
    />
  );
}
