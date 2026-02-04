-- Add visit_frequency to brand_stores junction table
ALTER TABLE brand_stores ADD COLUMN IF NOT EXISTS visit_frequency INTEGER NOT NULL DEFAULT 1;

-- Update existing records to use brand's default frequency
UPDATE brand_stores bs
SET visit_frequency = b.visit_frequency
FROM brands b
WHERE bs.brand_id = b.id;
