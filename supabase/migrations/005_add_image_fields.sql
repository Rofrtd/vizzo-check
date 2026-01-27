-- Add logo_url to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add logo_url to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add photo_url to promoters
ALTER TABLE promoters ADD COLUMN IF NOT EXISTS photo_url TEXT;
