-- Migrate existing agency_admin users to agency.
-- Must run in a separate transaction after 010: new enum values are not visible in the same transaction (PostgreSQL 55P04).
UPDATE users SET role = 'agency' WHERE role = 'agency_admin';
