create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists admins_select_self on public.admins;
create policy admins_select_self
on public.admins
for select
using (user_id = auth.uid());
