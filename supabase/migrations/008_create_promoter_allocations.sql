-- Create promoter_allocations table
CREATE TABLE promoter_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promoter_id UUID NOT NULL REFERENCES promoters(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL, -- Array of days: 0=Sunday, 1=Monday, ..., 6=Saturday
    frequency_per_week INTEGER NOT NULL DEFAULT 1, -- Number of visits per week
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(promoter_id, brand_id, store_id) -- One allocation per combination
);

-- Create indexes for performance
CREATE INDEX idx_promoter_allocations_promoter_id ON promoter_allocations(promoter_id);
CREATE INDEX idx_promoter_allocations_brand_id ON promoter_allocations(brand_id);
CREATE INDEX idx_promoter_allocations_store_id ON promoter_allocations(store_id);
CREATE INDEX idx_promoter_allocations_active ON promoter_allocations(active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promoter_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_promoter_allocations_updated_at
    BEFORE UPDATE ON promoter_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_promoter_allocations_updated_at();
