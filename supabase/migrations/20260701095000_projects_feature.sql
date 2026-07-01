-- Projects feature tables migration
-- Created: 2026-07-01

-- 1. Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_ghost_id text not null,
  owner_username text not null,
  title text not null,
  description text,
  image_url text,
  tags text[],
  github_url text,
  live_url text,
  looking_for_collaborators boolean default false,
  created_at timestamp default now()
);

-- 2. Project ratings (unique per user per project - allows updates)
create table if not exists project_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  rater_ghost_id text not null,
  rater_username text not null,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamp default now(),
  unique(project_id, rater_ghost_id)
);

-- 3. Collaborate requests
create table if not exists collaborate_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  project_title text not null,
  sender_ghost_id text not null,
  sender_username text not null,
  owner_ghost_id text not null,
  owner_username text not null,
  message text,
  skills text,
  status text default 'pending',
  created_at timestamp default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table project_ratings enable row level security;
alter table collaborate_requests enable row level security;

-- Permissive policies using DO block (CREATE POLICY IF NOT EXISTS is not valid PG syntax)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'projects' and policyname = 'allow_all_projects'
  ) then
    create policy allow_all_projects on projects for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'project_ratings' and policyname = 'allow_all_ratings'
  ) then
    create policy allow_all_ratings on project_ratings for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'collaborate_requests' and policyname = 'allow_all_collab'
  ) then
    create policy allow_all_collab on collaborate_requests for all using (true) with check (true);
  end if;
end $$;
