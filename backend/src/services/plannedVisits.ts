import { supabase } from '../lib/supabase.js';

export interface PlannedVisitsReport {
  planned: number;
  executed: number;
  completion_rate: number;
  period_days: number;
  unprogrammed_allocations: number;
  by_promoter: Array<{
    promoter_id: string;
    promoter_name: string;
    planned: number;
    executed: number;
  }>;
  by_brand: Array<{
    brand_id: string;
    brand_name: string;
    planned: number;
    executed: number;
  }>;
}

/**
 * Calculate planned visits for a given date range based on:
 * - Promoter's authorized brands and stores
 * - Brand visit frequency
 * - Promoter's visit frequency per brand (if configured)
 * - Number of days in the period (proportional calculation)
 */
export async function calculatePlannedVisits(
  agencyId: string,
  startDateStr: string,
  endDateStr: string
): Promise<PlannedVisitsReport> {
  // Parse dates
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // Calculate number of days in the period
  const timeDiff = endDate.getTime() - startDate.getTime();
  const periodDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  const weeksInPeriod = periodDays / 7;

  // Get all active promoters for this agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    return {
      planned: 0,
      executed: 0,
      completion_rate: 0,
      period_days: periodDays,
      unprogrammed_allocations: 0,
      by_promoter: [],
      by_brand: []
    };
  }

  const userIds = users.map(u => u.id);

  const { data: promoters, error: promotersError } = await supabase
    .from('promoters')
    .select('id, name, visit_frequency_per_brand, availability_days')
    .in('user_id', userIds)
    .eq('active', true);

  if (promotersError || !promoters || promoters.length === 0) {
    return {
      planned: 0,
      executed: 0,
      completion_rate: 0,
      period_days: periodDays,
      unprogrammed_allocations: 0,
      by_promoter: [],
      by_brand: []
    };
  }

  // Get all brands for this agency
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, visit_frequency')
    .eq('agency_id', agencyId);

  if (!brands || brands.length === 0) {
    return {
      planned: 0,
      executed: 0,
      completion_rate: 0,
      period_days: periodDays,
      unprogrammed_allocations: 0,
      by_promoter: [],
      by_brand: []
    };
  }

  // Get promoter-brand relationships
  const promoterIds = promoters.map(p => p.id);
  const { data: promoterBrands } = await supabase
    .from('promoter_brands')
    .select('promoter_id, brand_id')
    .in('promoter_id', promoterIds);

  // Get promoter-store relationships
  const { data: promoterStores } = await supabase
    .from('promoter_stores')
    .select('promoter_id, store_id')
    .in('promoter_id', promoterIds);

  // Get brand-store relationships
  const brandIds = brands.map(b => b.id);
  const { data: brandStores } = await supabase
    .from('brand_stores')
    .select('brand_id, store_id')
    .in('brand_id', brandIds);

  // Get active allocations for these promoters
  const { data: allocations } = await supabase
    .from('promoter_allocations')
    .select('promoter_id, brand_id, store_id, days_of_week, frequency_per_week')
    .in('promoter_id', promoterIds)
    .eq('active', true);

  // Create a map for quick lookup: key = `${promoter_id}-${brand_id}-${store_id}`
  const allocationMap = new Map<string, { days_of_week: number[], frequency_per_week: number }>();
  (allocations || []).forEach(alloc => {
    const key = `${alloc.promoter_id}-${alloc.brand_id}-${alloc.store_id}`;
    allocationMap.set(key, {
      days_of_week: alloc.days_of_week || [],
      frequency_per_week: alloc.frequency_per_week || 1
    });
  });

  // Helper function to count occurrences of specific days in a date range
  function countDaysInPeriod(daysOfWeek: number[], startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (daysOfWeek.includes(dayOfWeek)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  // Calculate planned visits proportionally based on period
  const plannedByPromoter = new Map<string, number>();
  const plannedByBrand = new Map<string, number>();
  let totalPlanned = 0;

  for (const promoter of promoters) {
    const promoterPlanned = new Map<string, number>(); // brand_id -> count
    
    // Get authorized brands for this promoter
    const authorizedBrandIds = (promoterBrands || [])
      .filter(pb => pb.promoter_id === promoter.id)
      .map(pb => pb.brand_id);

    // Get authorized stores for this promoter
    const authorizedStoreIds = (promoterStores || [])
      .filter(ps => ps.promoter_id === promoter.id)
      .map(ps => ps.store_id);

    for (const brandId of authorizedBrandIds) {
      const brand = brands.find(b => b.id === brandId);
      if (!brand) continue;

      // Get stores where this brand is present and promoter is authorized
      const validBrandStores = (brandStores || [])
        .filter(bs => bs.brand_id === brandId && authorizedStoreIds.includes(bs.store_id));

      if (validBrandStores.length === 0) continue;

      // Calculate planned visits for each store
      let plannedForBrand = 0;

      for (const brandStore of validBrandStores) {
        const storeId = brandStore.store_id;
        const allocationKey = `${promoter.id}-${brandId}-${storeId}`;
        const allocation = allocationMap.get(allocationKey);

        if (allocation && allocation.days_of_week.length > 0) {
          // Use specific allocation: count actual days in period
          const visitsForThisStore = countDaysInPeriod(
            allocation.days_of_week,
            startDate,
            endDate
          );
          plannedForBrand += visitsForThisStore;
        } else {
          // Use frequency specific to brand-store combination, then promoter override, then brand default
          const frequencyPerBrand = promoter.visit_frequency_per_brand as Record<string, number> || {};
          const brandStoreFrequency = brandStore.visit_frequency || brand.visit_frequency || 1;
          const frequencyPerWeek = frequencyPerBrand[brandId] || brandStoreFrequency;
          const visitsForPeriod = frequencyPerWeek * weeksInPeriod;
          plannedForBrand += visitsForPeriod;
        }
      }
      
      promoterPlanned.set(brandId, (promoterPlanned.get(brandId) || 0) + plannedForBrand);
      plannedByBrand.set(brandId, (plannedByBrand.get(brandId) || 0) + plannedForBrand);
    }

    const promoterTotal = Array.from(promoterPlanned.values()).reduce((a, b) => a + b, 0);
    plannedByPromoter.set(promoter.id, promoterTotal);
    totalPlanned += promoterTotal;
  }

  // Get executed visits for the period (inclusive dates)
  // Ensure startDate includes the entire day (from 00:00:00)
  const startDateTime = startDateStr.includes('T') ? startDateStr : `${startDateStr}T00:00:00`;
  // Ensure endDate includes the entire day (until 23:59:59)
  const endDateTime = endDateStr.includes('T') ? endDateStr : `${endDateStr}T23:59:59`;
  
  const { data: executedVisits } = await supabase
    .from('visits')
    .select('id, promoter_id, brand_id, store_id, timestamp')
    .in('promoter_id', promoterIds)
    .gte('timestamp', startDateTime)
    .lte('timestamp', endDateTime);

  // Count executed visits
  const executedByPromoter = new Map<string, number>();
  const executedByBrand = new Map<string, number>();
  let totalExecuted = 0;

  (executedVisits || []).forEach(visit => {
    totalExecuted++;
    executedByPromoter.set(
      visit.promoter_id,
      (executedByPromoter.get(visit.promoter_id) || 0) + 1
    );
    executedByBrand.set(
      visit.brand_id,
      (executedByBrand.get(visit.brand_id) || 0) + 1
    );
  });

  // Build report
  const byPromoter = promoters.map(p => ({
    promoter_id: p.id,
    promoter_name: p.name,
    planned: Math.round(plannedByPromoter.get(p.id) || 0),
    executed: executedByPromoter.get(p.id) || 0
  }));

  const byBrand = brands.map(b => ({
    brand_id: b.id,
    brand_name: b.name,
    planned: Math.round(plannedByBrand.get(b.id) || 0),
    executed: executedByBrand.get(b.id) || 0
  }));

  // Round planned visits first, then calculate completion rate
  const roundedPlanned = Math.round(totalPlanned);
  const completion_rate = roundedPlanned > 0 
    ? (totalExecuted / roundedPlanned) * 100 
    : 0;

  // Round to 1 decimal place for display
  const roundedCompletionRate = Math.round(completion_rate * 10) / 10;

  // Calculate unprogrammed allocations: active allocations that should have visits in the period but have none
  let unprogrammedAllocations = 0;
  
  if (allocations && allocations.length > 0) {
    // Create a set of executed visit combinations (promoter_id-brand_id-store_id) for quick lookup
    const executedCombinations = new Set<string>();
    (executedVisits || []).forEach(visit => {
      const visitKey = `${visit.promoter_id}-${visit.brand_id}-${visit.store_id}`;
      executedCombinations.add(visitKey);
    });

    // Check each allocation
    for (const allocation of allocations) {
      // Check if this allocation should have visits in this period
      const expectedVisits = countDaysInPeriod(
        allocation.days_of_week || [],
        startDate,
        endDate
      );

      // If this allocation should have visits in the period
      if (expectedVisits > 0) {
        // Check if there's at least one visit for this exact promoter-brand-store combination
        const allocationKey = `${allocation.promoter_id}-${allocation.brand_id}-${allocation.store_id}`;
        
        // If no visits exist for this exact allocation combination, it's unprogrammed
        if (!executedCombinations.has(allocationKey)) {
          unprogrammedAllocations++;
        }
      }
    }
  }

  return {
    planned: roundedPlanned,
    executed: totalExecuted,
    completion_rate: roundedCompletionRate,
    period_days: periodDays,
    unprogrammed_allocations: unprogrammedAllocations,
    by_promoter: byPromoter,
    by_brand: byBrand
  };
}
