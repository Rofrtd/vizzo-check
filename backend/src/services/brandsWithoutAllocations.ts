import { supabase } from '../lib/supabase.js';

export interface BrandWithoutAllocation {
  brand_id: string;
  brand_name: string;
  visit_frequency: number;
  stores_count: number;
  stores: Array<{
    store_id: string;
    store_name: string;
    visit_frequency: number | null;
  }>;
}

/**
 * Get brands that need allocations but don't have any active allocations
 * A brand needs allocations if:
 * - It has a visit_frequency > 0 (or stores with visit_frequency)
 * - It has stores associated (brand_stores)
 * - It doesn't have any active allocations (promoter_allocations)
 */
export async function getBrandsWithoutAllocations(
  agencyId: string
): Promise<BrandWithoutAllocation[]> {
  // Get all brands for this agency
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, visit_frequency')
    .eq('agency_id', agencyId);

  if (!brands || brands.length === 0) {
    return [];
  }

  const brandIds = brands.map(b => b.id);

  // Get brand-store relationships with visit_frequency
  const { data: brandStores } = await supabase
    .from('brand_stores')
    .select('brand_id, store_id, visit_frequency')
    .in('brand_id', brandIds);

  // Get all active allocations
  const { data: allocations } = await supabase
    .from('promoter_allocations')
    .select('brand_id, store_id')
    .eq('active', true)
    .in('brand_id', brandIds);

  // Create a set of brand-store combinations that have allocations
  const allocatedCombinations = new Set<string>();
  (allocations || []).forEach(alloc => {
    allocatedCombinations.add(`${alloc.brand_id}-${alloc.store_id}`);
  });

  // Get stores info
  const storeIds = [...new Set((brandStores || []).map(bs => bs.store_id))];
  const { data: stores } = await supabase
    .from('stores')
    .select('id, chain_name')
    .in('id', storeIds);

  const storeMap = new Map((stores || []).map(s => [s.id, s]));

  // Find brands that need allocations
  const brandsWithoutAllocations: BrandWithoutAllocation[] = [];

  for (const brand of brands) {
    // Get stores for this brand
    const brandStoresForBrand = (brandStores || []).filter(bs => bs.brand_id === brand.id);

    if (brandStoresForBrand.length === 0) {
      continue; // Brand has no stores, skip
    }

    // Check if brand has any active allocations
    const hasAllocations = brandStoresForBrand.some(bs => 
      allocatedCombinations.has(`${brand.id}-${bs.store_id}`)
    );

    // Check if brand needs visits (has frequency > 0)
    const needsVisits = brand.visit_frequency > 0 || 
      brandStoresForBrand.some(bs => (bs.visit_frequency || 0) > 0);

    if (needsVisits && !hasAllocations) {
      // Brand needs allocations but doesn't have any
      brandsWithoutAllocations.push({
        brand_id: brand.id,
        brand_name: brand.name,
        visit_frequency: brand.visit_frequency,
        stores_count: brandStoresForBrand.length,
        stores: brandStoresForBrand.map(bs => ({
          store_id: bs.store_id,
          store_name: storeMap.get(bs.store_id)?.chain_name || 'Loja desconhecida',
          visit_frequency: bs.visit_frequency
        }))
      });
    }
  }

  return brandsWithoutAllocations;
}
