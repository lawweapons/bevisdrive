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
  is_trashed?: boolean;
  trashed_at?: string | null;
  is_starred?: boolean;
  sort_order?: number;
}

export interface FolderRecord {
  id: string;
  owner_id: string;
  name: string;
  parent_id: string | null;
  color: string;
  icon: string;
  created_at: string;
}

export interface FileShare {
  id: string;
  file_id: string;
  link_token: string;
  expires_at: string | null;
  password_hash: string | null;
  view_count?: number;
  max_views?: number | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: "dark" | "light";
  view_mode: "list" | "grid";
  sort_by: string;
  sort_direction: "asc" | "desc";
}

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}
