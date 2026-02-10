-- Add new role values to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency';

-- Allow agency_id to be NULL for system_admin
ALTER TABLE users ALTER COLUMN agency_id DROP NOT NULL;
