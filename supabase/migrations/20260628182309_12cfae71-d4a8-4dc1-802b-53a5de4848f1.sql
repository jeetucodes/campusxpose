-- Remove always-true write policies. All inserts/updates are performed
-- server-side via the service role (which bypasses RLS), so these
-- anon/authenticated write policies are unnecessary and overly permissive.

DROP POLICY IF EXISTS "posts anon insert" ON public.posts;
DROP POLICY IF EXISTS "posts anon update" ON public.posts;
DROP POLICY IF EXISTS "incidents anon insert" ON public.incidents;
DROP POLICY IF EXISTS "ratings anon insert" ON public.ratings;
DROP POLICY IF EXISTS "evidence anon insert" ON public.evidence;
DROP POLICY IF EXISTS "messages anon insert" ON public.community_messages;