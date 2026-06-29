
CREATE TABLE public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'banner',
  body text,
  link_url text,
  media_url text,
  embed_url text,
  cta_label text,
  show_home boolean NOT NULL DEFAULT false,
  show_global boolean NOT NULL DEFAULT false,
  show_college boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads TO anon;
GRANT SELECT ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
ON public.ads FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE TABLE public.app_settings (
  key text NOT NULL PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.app_settings (key, value)
VALUES ('ads_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
