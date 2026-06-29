-- Reply support on all chat tables (denormalized for zero-join rendering)
ALTER TABLE public.global_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_username text,
  ADD COLUMN IF NOT EXISTS reply_to_content text;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_username text,
  ADD COLUMN IF NOT EXISTS reply_to_content text;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_username text,
  ADD COLUMN IF NOT EXISTS reply_to_content text;

-- Generic reactions table across all three chat surfaces
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('global','community','direct')),
  anonymous_user_hash text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, anonymous_user_hash, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_lookup
  ON public.message_reactions (message_type, message_id);

GRANT SELECT ON public.message_reactions TO anon, authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions are public/anonymous content: anyone may read. Writes happen only
-- through trusted server functions using the service role (bypasses RLS).
CREATE POLICY "Reactions are publicly readable"
  ON public.message_reactions FOR SELECT
  USING (true);

-- Live updates for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;