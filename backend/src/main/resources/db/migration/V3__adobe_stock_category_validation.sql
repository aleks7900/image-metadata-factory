-- V3__adobe_stock_category_validation.sql
-- Add category confidence, justification reason, suggested category, and manual edit flag

ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category_confidence DOUBLE PRECISION;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category_reason VARCHAR(1000);
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category_suggested INT;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category_manually_edited BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_image_jobs_category_edited ON image_jobs(category_manually_edited);
