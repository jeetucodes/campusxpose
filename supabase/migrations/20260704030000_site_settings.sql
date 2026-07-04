CREATE TABLE public.site_settings (
    id integer PRIMARY KEY DEFAULT 1,
    news_enabled boolean DEFAULT true
);

INSERT INTO public.site_settings (id, news_enabled) VALUES (1, true) ON CONFLICT DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin write access" ON public.site_settings FOR ALL USING (true);
