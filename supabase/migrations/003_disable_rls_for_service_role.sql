-- Disable RLS for service role operations
-- Since we're using service role key in the backend and handling authorization
-- in the application layer, we can disable RLS to avoid recursion issues

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own agency users" ON users;
DROP POLICY IF EXISTS "Users can view own agency" ON agencies;
DROP POLICY IF EXISTS "Agency admins can view all promoters" ON promoters;
DROP POLICY IF EXISTS "Users can view own agency brands" ON brands;
DROP POLICY IF EXISTS "Users can view own agency brand contacts" ON brand_contacts;
DROP POLICY IF EXISTS "Users can view own agency products" ON products;
DROP POLICY IF EXISTS "Users can view own agency stores" ON stores;
DROP POLICY IF EXISTS "Users can view own agency store contacts" ON store_contacts;
DROP POLICY IF EXISTS "Users can view own agency promoter brands" ON promoter_brands;
DROP POLICY IF EXISTS "Users can view own agency promoter stores" ON promoter_stores;
DROP POLICY IF EXISTS "Users can view own agency brand stores" ON brand_stores;
DROP POLICY IF EXISTS "Users can view own agency visits" ON visits;
DROP POLICY IF EXISTS "Users can view own agency visit products" ON visit_products;

-- Disable RLS on all tables
-- Authorization is handled in the backend API layer using agency_id checks
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE promoters DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE brand_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE brand_stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_products DISABLE ROW LEVEL SECURITY;
