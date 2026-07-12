-- Add status column to posts table
-- 'published' = visible to everyone
-- 'hold' = hidden, awaiting proof from the author

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);

-- Backfill: all existing posts are published
UPDATE public.posts SET status = 'published' WHERE status IS NULL;
