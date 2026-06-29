CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.refresh_clustered_incidents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recompute affected counts and trend from linked posts
  UPDATE public.incidents i SET
    affected_count = GREATEST(1, sub.cnt),
    trend = CASE
      WHEN sub.recent > sub.prev THEN 'rising'
      WHEN sub.recent < sub.prev THEN 'declining'
      ELSE 'stable'
    END::incident_trend,
    last_updated = now()
  FROM (
    SELECT incident_id,
      count(*) AS cnt,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS recent,
      count(*) FILTER (WHERE created_at >= now() - interval '14 days'
                        AND created_at < now() - interval '7 days') AS prev
    FROM public.posts
    WHERE incident_id IS NOT NULL
    GROUP BY incident_id
  ) sub
  WHERE i.id = sub.incident_id;

  -- Recompute verified proof counts from evidence
  UPDATE public.incidents i SET proof_count = COALESCE(sub.c, 0)
  FROM (
    SELECT incident_id, count(*) AS c
    FROM public.evidence
    WHERE incident_id IS NOT NULL AND is_verified = true
    GROUP BY incident_id
  ) sub
  WHERE i.id = sub.incident_id;

  -- Auto-resolve incidents that have gone quiet for 30+ days
  UPDATE public.incidents
  SET status = 'resolved', trend = 'declining'
  WHERE status = 'active'
    AND last_updated < now() - interval '30 days';
END;
$$;

SELECT cron.schedule(
  'refresh-clustered-incidents-daily',
  '0 1 * * *',
  $$ SELECT public.refresh_clustered_incidents(); $$
);