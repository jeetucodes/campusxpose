ALTER TABLE public.news_comments ADD COLUMN anonymous_user_hash text;

CREATE POLICY "Allow users to delete their own comments" ON public.news_comments
FOR DELETE USING (anonymous_user_hash = current_setting('request.jwt.claims', true)::json->>'sub');
-- Actually, the server function uses supabaseAdmin so RLS for delete is optional, but it's good practice. We'll handle authorization in the server function anyway.
