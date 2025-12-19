create extension if not exists pgcrypto;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null default 'user-files',
  path text not null,
  original_name text not null,
  size bigint not null,
  mime_type text not null,
  description text null,
  tags text[] not null default '{}',
  folder text not null,
  is_public boolean not null default false,
  content_text text null,
  search_vector tsvector null,
  created_at timestamptz not null default now(),
  unique (owner_id, path)
);

create index if not exists files_owner_folder_idx on public.files (owner_id, folder);
create index if not exists files_search_vector_idx on public.files using gin (search_vector);

create table if not exists public.file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  link_token text not null unique,
  expires_at timestamptz null,
  password_hash text null,
  created_at timestamptz not null default now()
);

create index if not exists file_shares_file_id_idx on public.file_shares (file_id);

create or replace function public.files_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.original_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.folder, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.content_text, '')), 'D');
  return new;
end;
$$;

drop trigger if exists files_set_search_vector_trigger on public.files;
create trigger files_set_search_vector_trigger
before insert or update of original_name, description, tags, folder, content_text
on public.files
for each row
execute function public.files_set_search_vector();

alter table public.files enable row level security;
alter table public.file_shares enable row level security;

drop policy if exists files_select_own_or_shared on public.files;
create policy files_select_own_or_shared
on public.files
for select
using (
  owner_id = auth.uid()
  or (
    current_setting('request.headers', true) is not null
    and (current_setting('request.headers', true)::jsonb->>'x-share-token') is not null
    and exists (
      select 1
      from public.file_shares fs
      where fs.file_id = public.files.id
        and fs.link_token = (current_setting('request.headers', true)::jsonb->>'x-share-token')
        and (fs.expires_at is null or fs.expires_at > now())
    )
  )
);

drop policy if exists files_insert_own on public.files;
create policy files_insert_own
on public.files
for insert
with check (owner_id = auth.uid());

drop policy if exists files_update_own on public.files;
create policy files_update_own
on public.files
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists files_delete_own on public.files;
create policy files_delete_own
on public.files
for delete
using (owner_id = auth.uid());

drop policy if exists file_shares_select_owner on public.file_shares;
create policy file_shares_select_owner
on public.file_shares
for select
using (
  exists (
    select 1
    from public.files f
    where f.id = public.file_shares.file_id
      and f.owner_id = auth.uid()
  )
);

drop policy if exists file_shares_insert_owner on public.file_shares;
create policy file_shares_insert_owner
on public.file_shares
for insert
with check (
  exists (
    select 1
    from public.files f
    where f.id = public.file_shares.file_id
      and f.owner_id = auth.uid()
  )
);

drop policy if exists file_shares_update_owner on public.file_shares;
create policy file_shares_update_owner
on public.file_shares
for update
using (
  exists (
    select 1
    from public.files f
    where f.id = public.file_shares.file_id
      and f.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.files f
    where f.id = public.file_shares.file_id
      and f.owner_id = auth.uid()
  )
);

drop policy if exists file_shares_delete_owner on public.file_shares;
create policy file_shares_delete_owner
on public.file_shares
for delete
using (
  exists (
    select 1
    from public.files f
    where f.id = public.file_shares.file_id
      and f.owner_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists storage_user_files_select_own on storage.objects;
create policy storage_user_files_select_own
on storage.objects
for select
using (
  bucket_id = 'user-files'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_user_files_insert_own on storage.objects;
create policy storage_user_files_insert_own
on storage.objects
for insert
with check (
  bucket_id = 'user-files'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_user_files_update_own on storage.objects;
create policy storage_user_files_update_own
on storage.objects
for update
using (
  bucket_id = 'user-files'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-files'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_user_files_delete_own on storage.objects;
create policy storage_user_files_delete_own
on storage.objects
for delete
using (
  bucket_id = 'user-files'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);
