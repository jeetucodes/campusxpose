-- Add likes column to confessions table
alter table public.confessions add column if not exists likes integer default 0;
