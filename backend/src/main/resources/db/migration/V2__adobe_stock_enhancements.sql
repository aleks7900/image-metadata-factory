-- V2__adobe_stock_enhancements.sql
-- Add Adobe Stock category, releases, image dimensions, AI generation flag, and compliance status

ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category INT;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS releases VARCHAR(500);
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS image_width INT;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS image_height INT;
ALTER TABLE image_jobs ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'PASS';

CREATE INDEX IF NOT EXISTS idx_image_jobs_category ON image_jobs(category);
CREATE INDEX IF NOT EXISTS idx_image_jobs_compliance ON image_jobs(compliance_status);
