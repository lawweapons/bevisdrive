import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: share, error: shareError } = await supabase
      .from("file_shares")
      .select("*, files(*)")
      .eq("link_token", token)
      .maybeSingle();

    if (shareError || !share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    if (share.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: "Password required" },
          { status: 401 }
        );
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const inputHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (inputHash !== share.password_hash) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    const file = share.files;
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 300, {
        download: file.original_name,
      });

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
  } catch (err) {
    console.error("Share download error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
