CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  message text NOT NULL,
  user_username text,
  user_hash text,
  status text NOT NULL DEFAULT 'new',
  admin_reply text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to feedback"
  ON public.feedback
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);