create table public.confessions (
    id uuid default gen_random_uuid() primary key,
    content text not null,
    username text default 'Anonymous',
    created_at timestamp with time zone default now()
);

alter table public.confessions enable row level security;

create policy "Allow public read access to confessions" 
on public.confessions for select 
using (true);

create policy "Allow public insert to confessions" 
on public.confessions for insert 
with check (true);
