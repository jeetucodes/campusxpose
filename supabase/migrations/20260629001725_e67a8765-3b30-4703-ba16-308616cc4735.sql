-- 1. One rating per user per college: remove duplicates (keep latest), add unique constraint
DELETE FROM public.ratings r
USING public.ratings r2
WHERE r.college_id = r2.college_id
  AND r.anonymous_user_hash = r2.anonymous_user_hash
  AND r.created_at < r2.created_at;

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_unique_user_college UNIQUE (college_id, anonymous_user_hash);

-- 2. Keep colleges.incident_count in sync with the number of reports (posts)
CREATE OR REPLACE FUNCTION public.sync_incident_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.colleges
      SET incident_count = COALESCE(incident_count, 0) + 1
      WHERE id = NEW.college_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.colleges
      SET incident_count = GREATEST(COALESCE(incident_count, 0) - 1, 0)
      WHERE id = OLD.college_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_incident_count ON public.posts;
CREATE TRIGGER trg_sync_incident_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_incident_count();

-- Backfill current counts from existing posts
UPDATE public.colleges c
SET incident_count = COALESCE(p.cnt, 0)
FROM (SELECT college_id, COUNT(*) AS cnt FROM public.posts GROUP BY college_id) p
WHERE p.college_id = c.id;
