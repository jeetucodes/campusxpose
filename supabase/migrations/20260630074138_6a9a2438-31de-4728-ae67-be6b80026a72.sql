CREATE TABLE public.anon_users (
  user_hash TEXT PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  forgotten BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.anon_users TO service_role;

ALTER TABLE public.anon_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_anon_users_updated_at
BEFORE UPDATE ON public.anon_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();