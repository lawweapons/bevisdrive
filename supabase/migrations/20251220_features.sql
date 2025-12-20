-- =====================================================
-- BEVIS DRIVE FEATURE EXPANSION MIGRATION
-- =====================================================

-- 1. UPDATE FILES TABLE: Add trash, favorites, sort order
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS is_trashed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 2. UPDATE FOLDERS TABLE: Add nested folders, colors, icons
ALTER TABLE public.folders
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS icon text DEFAULT '📁';

-- 3. UPDATE FILE_SHARES TABLE: Add expiration, view count
ALTER TABLE public.file_shares
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_views integer;

-- 4. CREATE ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_select_own ON public.activity_log
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY activity_log_insert_own ON public.activity_log
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. CREATE USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark',
  view_mode text DEFAULT 'list',
  sort_by text DEFAULT 'created_at',
  sort_direction text DEFAULT 'desc',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_own ON public.user_preferences
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_preferences_insert_own ON public.user_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_update_own ON public.user_preferences
FOR UPDATE USING (user_id = auth.uid());

-- 6. CREATE FILE VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  path text NOT NULL,
  size bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY file_versions_select_own ON public.file_versions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.files WHERE files.id = file_versions.file_id AND files.owner_id = auth.uid())
);

CREATE POLICY file_versions_insert_own ON public.file_versions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.files WHERE files.id = file_versions.file_id AND files.owner_id = auth.uid())
);

-- 7. CREATE SHARED_WITH_USERS TABLE (for sharing with specific users)
CREATE TABLE IF NOT EXISTS public.shared_with_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text DEFAULT 'view',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT file_or_folder CHECK (file_id IS NOT NULL OR folder_id IS NOT NULL)
);

ALTER TABLE public.shared_with_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_with_users_select ON public.shared_with_users
FOR SELECT USING (
  shared_by = auth.uid() OR 
  shared_with_user_id = auth.uid() OR
  shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY shared_with_users_insert ON public.shared_with_users
FOR INSERT WITH CHECK (shared_by = auth.uid());

CREATE POLICY shared_with_users_delete ON public.shared_with_users
FOR DELETE USING (shared_by = auth.uid());

-- 8. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_files_trashed ON public.files(owner_id, is_trashed);
CREATE INDEX IF NOT EXISTS idx_files_starred ON public.files(owner_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON public.folders(parent_id);

-- 9. FUNCTION TO INCREMENT VIEW COUNT
CREATE OR REPLACE FUNCTION increment_share_view_count(share_token text)
RETURNS void AS $$
BEGIN
  UPDATE public.file_shares 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE token = share_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNCTION TO LOG ACTIVITY
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, entity_name, metadata)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
