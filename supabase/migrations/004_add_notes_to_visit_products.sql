-- Add notes column to visit_products table
ALTER TABLE visit_products ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make photo URLs nullable temporarily (they'll be updated after upload)
ALTER TABLE visit_products ALTER COLUMN photo_before_url DROP NOT NULL;
ALTER TABLE visit_products ALTER COLUMN photo_after_url DROP NOT NULL;
