-- Ensure: system_admin has no agency; other roles must have agency_id.
-- Must run in a separate transaction after 010: new enum values cannot be referenced in the same transaction (PostgreSQL 55P04).
ALTER TABLE users ADD CONSTRAINT users_role_agency_check CHECK (
  (role = 'system_admin' AND agency_id IS NULL) OR
  (role <> 'system_admin' AND agency_id IS NOT NULL)
);
