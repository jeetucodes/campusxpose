create table public.news (
    id uuid default gen_random_uuid() primary key,
    text text not null,
    link_url text,
    image_url text,
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

alter table public.news enable row level security;

create policy "Allow public read access to active news" 
on public.news for select 
using (is_active = true);
