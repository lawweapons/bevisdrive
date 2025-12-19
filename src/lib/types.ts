export interface FileRecord {
  id: string;
  owner_id: string;
  bucket: string;
  path: string;
  original_name: string;
  size: number;
  mime_type: string;
  description: string | null;
  tags: string[];
  folder: string;
  is_public: boolean;
  content_text: string | null;
  created_at: string;
}

export interface FileShare {
  id: string;
  file_id: string;
  link_token: string;
  expires_at: string | null;
  password_hash: string | null;
  created_at: string;
}

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}
