ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS types college_type[] NOT NULL DEFAULT '{}';
ALTER TABLE public.college_requests ADD COLUMN IF NOT EXISTS types college_type[] NOT NULL DEFAULT '{}';
UPDATE public.colleges SET types = ARRAY[type] WHERE cardinality(types) = 0;
UPDATE public.college_requests SET types = ARRAY[type] WHERE cardinality(types) = 0;