DROP POLICY IF EXISTS "Reactions are publicly readable" ON public.message_reactions;

CREATE POLICY "Non-direct reactions are publicly readable"
ON public.message_reactions
FOR SELECT
USING (message_type <> 'direct');