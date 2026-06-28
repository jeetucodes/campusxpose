-- Global platform-wide chat room
CREATE TABLE public.global_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_user_hash text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_messages TO anon, authenticated;
GRANT ALL ON public.global_messages TO service_role;

ALTER TABLE public.global_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_messages public read"
  ON public.global_messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anonymous 1:1 direct messages, identified by anonymous username
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_hash text NOT NULL,
  sender_username text NOT NULL,
  recipient_username text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.direct_messages TO anon, authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_messages public read"
  ON public.direct_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_direct_messages_participants
  ON public.direct_messages (recipient_username, sender_username, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.global_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;