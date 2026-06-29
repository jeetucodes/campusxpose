
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL DEFAULT 'global',
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  anonymous_user_hash text NOT NULL,
  username text NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  anonymous_user_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, anonymous_user_hash)
);

CREATE INDEX idx_polls_college ON public.polls(college_id);
CREATE INDEX idx_polls_scope ON public.polls(scope);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

GRANT SELECT ON public.polls TO anon, authenticated;
GRANT ALL ON public.polls TO service_role;
GRANT SELECT ON public.poll_votes TO anon, authenticated;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls public read" ON public.polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "poll_votes public read" ON public.poll_votes FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;

CREATE OR REPLACE FUNCTION public.delete_expired_polls()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.polls WHERE expires_at < now();
$$;

SELECT cron.schedule(
  'delete-expired-polls',
  '*/10 * * * *',
  $$ SELECT public.delete_expired_polls(); $$
);
