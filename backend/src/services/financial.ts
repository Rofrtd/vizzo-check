import { supabase } from '../lib/supabase.js';
import { FinancialReport, FinancialReportQuery } from '@vizzocheck/shared';

export async function calculateFinancialReport(
  agencyId: string,
  query: FinancialReportQuery
): Promise<FinancialReport> {
  const { startDate, endDate, groupBy } = query;

  // First, get all promoters for this agency
  const { data: promoters } = await supabase
    .from('promoters')
    .select('id, payment_per_visit, user:users!inner(agency_id)')
    .eq('user.agency_id', agencyId);

  if (!promoters || promoters.length === 0) {
    return {
      total_visits: 0,
      total_promoter_payments: 0,
      total_brand_charges: 0,
      gross_margin: 0,
      grouped_data: []
    };
  }

  const promoterIds = promoters.map(p => p.id);
  const promoterPaymentMap = new Map(promoters.map(p => [p.id, parseFloat(p.payment_per_visit || '0')]));

  // Build visit query
  let visitQuery = supabase
    .from('visits')
    .select('id, promoter_id, brand_id, store_id, timestamp, brands(price_per_visit), stores(address), promoters(city)')
    .in('promoter_id', promoterIds);

  if (startDate) {
    visitQuery = visitQuery.gte('timestamp', startDate);
  }
  if (endDate) {
    visitQuery = visitQuery.lte('timestamp', endDate);
  }

  const { data: visits, error } = await visitQuery;

  if (error) {
    throw new Error(`Failed to fetch visits: ${error.message}`);
  }

  if (!visits || visits.length === 0) {
    return {
      total_visits: 0,
      total_promoter_payments: 0,
      total_brand_charges: 0,
      gross_margin: 0,
      grouped_data: []
    };
  }

  // Calculate totals
  let total_visits = visits.length;
  let total_promoter_payments = 0;
  let total_brand_charges = 0;

  const groupedMap = new Map<string, {
    visits: number;
    promoter_payments: number;
    brand_charges: number;
  }>();

  // Helper function to extract city from address
  const extractCityFromAddress = (address: string): string => {
    if (!address) return 'Unknown';
    // Try to extract city from address (assumes format like "Street, City, State" or "City, State")
    const parts = address.split(',').map(p => p.trim());
    // Usually city is the second-to-last or last part before state/country
    if (parts.length >= 2) {
      return parts[parts.length - 2] || parts[parts.length - 1] || 'Unknown';
    }
    return parts[0] || 'Unknown';
  };

  for (const visit of visits) {
    const brand = visit.brands as any;
    const store = visit.stores as any;
    const promoter = visit.promoters as any;

    const paymentPerVisit = promoterPaymentMap.get(visit.promoter_id) || 0;
    const chargePerVisit = parseFloat(brand?.price_per_visit || '0');

    total_promoter_payments += paymentPerVisit;
    total_brand_charges += chargePerVisit;

    if (groupBy) {
      let groupKey = '';
      if (groupBy === 'brand') {
        groupKey = brand.id;
      } else if (groupBy === 'store') {
        groupKey = visit.store_id;
      } else if (groupBy === 'city') {
        // Extract city from store address, fallback to promoter city
        const city = store?.address ? extractCityFromAddress(store.address) : (promoter?.city || 'Unknown');
        groupKey = city;
      }

      if (groupKey) {
        const existing = groupedMap.get(groupKey) || {
          visits: 0,
          promoter_payments: 0,
          brand_charges: 0
        };
        existing.visits += 1;
        existing.promoter_payments += paymentPerVisit;
        existing.brand_charges += chargePerVisit;
        groupedMap.set(groupKey, existing);
      }
    }
  }

  const gross_margin = total_brand_charges - total_promoter_payments;

  // Format grouped data
  const grouped_data = groupBy ? Array.from(groupedMap.entries()).map(([group_key, data]) => ({
    group_key,
    visits: data.visits,
    promoter_payments: data.promoter_payments,
    brand_charges: data.brand_charges,
    gross_margin: data.brand_charges - data.promoter_payments
  })) : undefined;

  return {
    total_visits,
    total_promoter_payments,
    total_brand_charges,
    gross_margin,
    grouped_data
  };
}
