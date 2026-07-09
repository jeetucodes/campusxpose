-- Migration to add website and fee_structure to colleges

ALTER TABLE colleges
ADD COLUMN website text DEFAULT NULL,
ADD COLUMN fee_structure text DEFAULT NULL;
