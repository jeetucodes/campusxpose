-- Make verification follow the person (hash), not the username string.
-- 1) Drop rows with no hash (cannot be matched to a person reliably).
DELETE FROM public.verified_users WHERE user_hash IS NULL;

-- 2) Deduplicate: keep only the most recent row per user_hash.
DELETE FROM public.verified_users a
USING public.verified_users b
WHERE a.user_hash = b.user_hash
  AND a.created_at < b.created_at;

-- 3) Require a hash and enforce one verification row per person.
ALTER TABLE public.verified_users ALTER COLUMN user_hash SET NOT NULL;
ALTER TABLE public.verified_users ADD CONSTRAINT verified_users_user_hash_key UNIQUE (user_hash);