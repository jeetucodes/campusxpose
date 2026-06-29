CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  anonymous_user_hash text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.post_comments TO anon, authenticated;
GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post comments public read" ON public.post_comments
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX idx_post_comments_post_id ON public.post_comments (post_id);
CREATE INDEX idx_post_comments_parent_id ON public.post_comments (parent_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;