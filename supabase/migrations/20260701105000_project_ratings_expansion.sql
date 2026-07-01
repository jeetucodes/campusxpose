-- Migration to add specific rating categories to project_ratings
-- Created: 2026-07-01

ALTER TABLE project_ratings
ADD COLUMN IF NOT EXISTS rating_ui INTEGER CHECK (rating_ui BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_functionality INTEGER CHECK (rating_functionality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_concept INTEGER CHECK (rating_concept BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_bugs INTEGER CHECK (rating_bugs BETWEEN 1 AND 5);
