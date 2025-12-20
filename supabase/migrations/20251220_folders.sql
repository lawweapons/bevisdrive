-- Create folders table for persistent folder storage
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(owner_id, name)
);

-- Enable RLS
alter table public.folders enable row level security;

-- Policy: users can only see their own folders
create policy folders_select_own on public.folders
for select using (owner_id = auth.uid());

-- Policy: users can insert their own folders
create policy folders_insert_own on public.folders
for insert with check (owner_id = auth.uid());

-- Policy: users can delete their own folders
create policy folders_delete_own on public.folders
for delete using (owner_id = auth.uid());
