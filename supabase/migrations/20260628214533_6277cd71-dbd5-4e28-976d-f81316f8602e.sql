CREATE TABLE public.post_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    anonymous_user_hash text NOT NULL,
    dir text NOT NULL CHECK (dir IN ('up', 'down')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, anonymous_user_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_votes TO authenticated;
GRANT SELECT ON public.post_votes TO anon;
GRANT ALL ON public.post_votes TO service_role;

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read post_votes"
ON public.post_votes
FOR SELECT
TO anon, authenticated
USING (true);