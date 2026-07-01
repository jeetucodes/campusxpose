-- Add image_url to global_messages
ALTER TABLE public.global_messages 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to direct_messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to community_messages
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS image_url text;
