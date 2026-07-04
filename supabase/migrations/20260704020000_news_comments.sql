CREATE TABLE public.news_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
    username text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.news_comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.news_comments FOR INSERT WITH CHECK (true);

ALTER TABLE public.news ADD COLUMN comment_count integer default 0;
