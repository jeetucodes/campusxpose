CREATE TABLE public.college_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  type college_type NOT NULL,
  established integer,
  description text,
  requester_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.college_requests TO service_role;

ALTER TABLE public.college_requests ENABLE ROW LEVEL SECURITY;
