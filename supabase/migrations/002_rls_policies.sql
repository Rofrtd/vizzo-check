-- Enable Row Level Security on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_products ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's agency_id
-- This will be used by the backend service role, but we create it for reference
CREATE OR REPLACE FUNCTION get_user_agency_id(user_id UUID)
RETURNS UUID AS $$
    SELECT agency_id FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Agencies: Users can only see their own agency
CREATE POLICY "Users can view own agency"
    ON agencies FOR SELECT
    USING (id IN (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Users: Users can only see users from their agency
CREATE POLICY "Users can view own agency users"
    ON users FOR SELECT
    USING (agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Promoters: Agency admins can see all promoters in their agency
-- Promoters can see their own record
CREATE POLICY "Agency admins can view all promoters"
    ON promoters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = (SELECT agency_id FROM promoters WHERE promoters.id = promoters.id)
            AND users.role = 'agency_admin'
        )
        OR user_id = auth.uid()
    );

-- Brands: Users can only see brands from their agency
CREATE POLICY "Users can view own agency brands"
    ON brands FOR SELECT
    USING (agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Brand contacts: Users can see contacts for brands in their agency
CREATE POLICY "Users can view own agency brand contacts"
    ON brand_contacts FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM brands
            WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
        )
    );

-- Products: Users can see products for brands in their agency
CREATE POLICY "Users can view own agency products"
    ON products FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM brands
            WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
        )
    );

-- Stores: Users can only see stores from their agency
CREATE POLICY "Users can view own agency stores"
    ON stores FOR SELECT
    USING (agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Store contacts: Users can see contacts for stores in their agency
CREATE POLICY "Users can view own agency store contacts"
    ON store_contacts FOR SELECT
    USING (
        store_id IN (
            SELECT id FROM stores
            WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
        )
    );

-- Promoter-Brand junction: Users can see relationships in their agency
CREATE POLICY "Users can view own agency promoter brands"
    ON promoter_brands FOR SELECT
    USING (
        promoter_id IN (
            SELECT id FROM promoters
            WHERE user_id IN (
                SELECT id FROM users
                WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
            )
        )
    );

-- Promoter-Store junction: Users can see relationships in their agency
CREATE POLICY "Users can view own agency promoter stores"
    ON promoter_stores FOR SELECT
    USING (
        promoter_id IN (
            SELECT id FROM promoters
            WHERE user_id IN (
                SELECT id FROM users
                WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
            )
        )
    );

-- Brand-Store junction: Users can see relationships in their agency
CREATE POLICY "Users can view own agency brand stores"
    ON brand_stores FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM brands
            WHERE agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
        )
    );

-- Visits: Agency admins can see all visits in their agency
-- Promoters can see their own visits
CREATE POLICY "Users can view own agency visits"
    ON visits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = (
                SELECT agency_id FROM promoters
                WHERE promoters.id = visits.promoter_id
            )
        )
    );

-- Visit products: Users can see products for visits they can access
CREATE POLICY "Users can view own agency visit products"
    ON visit_products FOR SELECT
    USING (
        visit_id IN (
            SELECT id FROM visits
            WHERE EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.agency_id = (
                    SELECT agency_id FROM promoters
                    WHERE promoters.id = visits.promoter_id
                )
            )
        )
    );

-- Note: For INSERT, UPDATE, DELETE operations, we'll handle authorization
-- in the backend API using JWT tokens and service role key.
-- RLS policies above are primarily for direct database access scenarios.
