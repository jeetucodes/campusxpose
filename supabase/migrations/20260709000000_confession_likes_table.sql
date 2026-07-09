-- Create a proper per-device confession likes table
-- This replaces the naive integer counter approach

create table if not exists public.confession_likes (
    confession_id uuid not null references public.confessions(id) on delete cascade,
    device_id text not null,
    created_at timestamp with time zone default now(),
    primary key (confession_id, device_id)
);

alter table public.confession_likes enable row level security;

create policy "Allow public read on confession_likes"
on public.confession_likes for select
using (true);

create policy "Allow public insert on confession_likes"
on public.confession_likes for insert
with check (true);

create policy "Allow public delete on confession_likes"
on public.confession_likes for delete
using (true);
