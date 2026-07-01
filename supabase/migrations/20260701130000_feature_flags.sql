-- Insert projects_enabled feature flag into app_settings, default true
INSERT INTO public.app_settings (key, value)
VALUES ('projects_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
