-- Add new role values to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency';

-- Allow agency_id to be NULL for system_admin
ALTER TABLE users ALTER COLUMN agency_id DROP NOT NULL;

-- Ensure: system_admin has no agency; other roles must have agency_id
ALTER TABLE users ADD CONSTRAINT users_role_agency_check CHECK (
  (role = 'system_admin' AND agency_id IS NULL) OR
  (role <> 'system_admin' AND agency_id IS NOT NULL)
);
