-- Ensure no direct Data API access for public roles; these tables are
-- accessed only through trusted server-side (service role) logic.

REVOKE ALL ON public.college_requests FROM anon, authenticated;
REVOKE ALL ON public.direct_messages FROM anon, authenticated;

GRANT ALL ON public.college_requests TO service_role;
GRANT ALL ON public.direct_messages TO service_role;

-- Explicit deny-all policies make the fail-closed intent clear and prevent
-- accidental exposure if a permissive policy is ever added later.

DROP POLICY IF EXISTS "No public access to college_requests" ON public.college_requests;
CREATE POLICY "No public access to college_requests"
ON public.college_requests
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No public access to direct_messages" ON public.direct_messages;
CREATE POLICY "No public access to direct_messages"
ON public.direct_messages
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);