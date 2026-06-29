CREATE TABLE public.verified_users (
  username text PRIMARY KEY,
  user_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verified_users TO anon, authenticated;
GRANT ALL ON public.verified_users TO service_role;
ALTER TABLE public.verified_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read verified users"
  ON public.verified_users FOR SELECT TO anon, authenticated USING (true);