# Supabase Setup

This directory contains database migrations for VizzoCheck.

## Setup

1. Install Supabase CLI:
```bash
bun add -g supabase
```

2. Initialize Supabase (if not already done):
```bash
supabase init
```

3. Link to your Supabase project:
```bash
supabase link --project-ref your-project-ref
```

4. Run migrations:
```bash
supabase db push
```

Or apply migrations manually in the Supabase dashboard SQL editor.

## Migrations

- `001_initial_schema.sql` - Creates all tables, indexes, and triggers
- `002_rls_policies.sql` - Sets up Row Level Security policies

## Important Notes

- The RLS policies use `auth.uid()` which requires Supabase Auth
- For the MVP, we'll use JWT authentication from the backend
- The backend will use the service role key to bypass RLS
- Agency-level isolation is enforced in the backend API layer
