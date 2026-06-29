ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS recipient_hash text;

-- Backfill recipient_hash from known username -> hash pairs across the app
WITH known AS (
  SELECT username, anonymous_user_hash AS hash, created_at FROM public.posts
  UNION ALL
  SELECT username, anonymous_user_hash AS hash, created_at FROM public.global_messages
  UNION ALL
  SELECT username, anonymous_user_hash AS hash, created_at FROM public.community_messages
  UNION ALL
  SELECT sender_username AS username, sender_hash AS hash, created_at FROM public.direct_messages
),
latest AS (
  SELECT DISTINCT ON (username) username, hash
  FROM known
  WHERE username IS NOT NULL AND hash IS NOT NULL
  ORDER BY username, created_at DESC
)
UPDATE public.direct_messages dm
SET recipient_hash = l.hash
FROM latest l
WHERE dm.recipient_hash IS NULL
  AND dm.recipient_username = l.username;

CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_hash ON public.direct_messages (recipient_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_hash ON public.direct_messages (sender_hash, created_at);