import { supabase } from "../lib/supabase.js";

// Helper to ensure dates are inclusive (startDate from 00:00:00, endDate until 23:59:59)
function normalizeStartDate(dateStr: string): string {
  return dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
}

function normalizeEndDate(dateStr: string): string {
  return dateStr.includes("T") ? dateStr : `${dateStr}T23:59:59`;
}

export interface PromoterReportItem {
  promoter_id: string;
  promoter_name: string;
  promoter_email: string;
  total_visits: number;
  total_payment: number;
  payment_per_visit: number;
}

export interface BrandReportItem {
  brand_id: string;
  brand_name: string;
  total_visits: number;
  total_charge: number;
  price_per_visit: number;
}

export interface StoreReportItem {
  store_id: string;
  store_name: string;
  store_address: string;
  total_visits: number;
  total_promoter_payments: number;
  total_brand_charges: number;
  gross_margin: number;
}

export interface ToBePaidItem {
  promoter_id: string;
  promoter_name: string;
  promoter_email: string;
  promoter_phone: string;
  total_visits: number;
  total_amount: number;
  payment_per_visit: number;
}

export interface ToBeReceivedItem {
  brand_id: string;
  brand_name: string;
  total_visits: number;
  total_amount: number;
  price_per_visit: number;
}

// Report by Promoter
export async function getPromoterReport(
  agencyId: string,
  startDate?: string,
  endDate?: string,
): Promise<PromoterReportItem[]> {
  // Get all promoters for this agency - first get user IDs
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id")
    .eq("agency_id", agencyId);

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return [];
  }

  if (!users || users.length === 0) {
    console.log("No users found for agency:", agencyId);
    return [];
  }

  const userIds = users.map((u) => u.id);
  console.log("Found users:", userIds.length);

  // Then get promoters
  const { data: promoters, error: promotersError } = await supabase
    .from("promoters")
    .select("id, name, payment_per_visit, user_id")
    .in("user_id", userIds)
    .eq("active", true);

  if (promotersError) {
    console.error("Error fetching promoters:", promotersError);
    return [];
  }

  if (!promoters || promoters.length === 0) {
    return [];
  }

  // Get user emails separately
  const { data: userEmails } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const emailMap = new Map((userEmails || []).map((u) => [u.id, u.email]));

  const promoterIds = promoters.map((p) => p.id);
  const promoterMap = new Map(
    promoters.map((p) => [
      p.id,
      {
        name: p.name,
        email: emailMap.get(p.user_id) || "",
        payment_per_visit: parseFloat(p.payment_per_visit || "0"),
      },
    ]),
  );

  // Get visits for these promoters
  let visitQuery = supabase
    .from("visits")
    .select("id, promoter_id, timestamp")
    .in("promoter_id", promoterIds);

  if (startDate) {
    visitQuery = visitQuery.gte("timestamp", normalizeStartDate(startDate));
  }
  if (endDate) {
    visitQuery = visitQuery.lte("timestamp", normalizeEndDate(endDate));
  }

  const { data: visits, error: visitsError } = await visitQuery;

  if (visitsError) {
    console.error("Error fetching visits:", visitsError);
    return promoters.map((p) => {
      const promoterInfo = promoterMap.get(p.id)!;
      return {
        promoter_id: p.id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        total_visits: 0,
        total_payment: 0,
        payment_per_visit: promoterInfo.payment_per_visit,
      };
    });
  }

  console.log(
    "Found visits:",
    visits?.length || 0,
    "for promoters:",
    promoterIds,
  );

  if (!visits || visits.length === 0) {
    return promoters.map((p) => {
      const promoterInfo = promoterMap.get(p.id)!;
      return {
        promoter_id: p.id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        total_visits: 0,
        total_payment: 0,
        payment_per_visit: promoterInfo.payment_per_visit,
      };
    });
  }

  // Group visits by promoter
  const promoterStats = new Map<string, { visits: number; total: number }>();

  for (const visit of visits) {
    const promoterInfo = promoterMap.get(visit.promoter_id);
    if (!promoterInfo) continue;

    const paymentPerVisit = promoterInfo.payment_per_visit;
    const existing = promoterStats.get(visit.promoter_id) || {
      visits: 0,
      total: 0,
    };
    existing.visits += 1;
    existing.total += paymentPerVisit;
    promoterStats.set(visit.promoter_id, existing);
  }

  // Format results - include promoters with 0 visits
  const resultMap = new Map<string, PromoterReportItem>();

  // Add promoters with visits
  Array.from(promoterStats.entries()).forEach(([promoter_id, stats]) => {
    const promoterInfo = promoterMap.get(promoter_id);
    if (promoterInfo) {
      resultMap.set(promoter_id, {
        promoter_id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        total_visits: stats.visits,
        total_payment: stats.total,
        payment_per_visit: promoterInfo.payment_per_visit,
      });
    }
  });

  // Add promoters without visits
  promoters.forEach((p) => {
    if (!resultMap.has(p.id)) {
      const promoterInfo = promoterMap.get(p.id)!;
      resultMap.set(p.id, {
        promoter_id: p.id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        total_visits: 0,
        total_payment: 0,
        payment_per_visit: promoterInfo.payment_per_visit,
      });
    }
  });

  return Array.from(resultMap.values()).sort(
    (a, b) => b.total_payment - a.total_payment,
  );
}

// Report by Brand
export async function getBrandReport(
  agencyId: string,
  startDate?: string,
  endDate?: string,
): Promise<BrandReportItem[]> {
  // Get all brands for this agency
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id, name, price_per_visit")
    .eq("agency_id", agencyId);

  if (brandsError) {
    console.error("Error fetching brands:", brandsError);
    return [];
  }

  if (!brands || brands.length === 0) {
    return [];
  }

  const brandIds = brands.map((b) => b.id);
  const brandMap = new Map(
    brands.map((b) => [
      b.id,
      {
        name: b.name,
        price_per_visit: parseFloat(b.price_per_visit || "0"),
      },
    ]),
  );

  // Get visits for these brands
  let visitQuery = supabase
    .from("visits")
    .select("id, brand_id, timestamp")
    .in("brand_id", brandIds);

  if (startDate) {
    visitQuery = visitQuery.gte("timestamp", normalizeStartDate(startDate));
  }
  if (endDate) {
    visitQuery = visitQuery.lte("timestamp", normalizeEndDate(endDate));
  }

  const { data: visits, error: visitsError } = await visitQuery;

  if (visitsError) {
    console.error("Error fetching visits:", visitsError);
    return brands.map((b) => ({
      brand_id: b.id,
      brand_name: b.name,
      total_visits: 0,
      total_charge: 0,
      price_per_visit: parseFloat(b.price_per_visit || "0"),
    }));
  }

  if (!visits || visits.length === 0) {
    return brands.map((b) => ({
      brand_id: b.id,
      brand_name: b.name,
      total_visits: 0,
      total_charge: 0,
      price_per_visit: parseFloat(b.price_per_visit || "0"),
    }));
  }

  // Group visits by brand
  const brandStats = new Map<string, { visits: number; total: number }>();

  for (const visit of visits) {
    const brandInfo = brandMap.get(visit.brand_id);
    if (!brandInfo) continue;

    const chargePerVisit = brandInfo.price_per_visit;
    const existing = brandStats.get(visit.brand_id) || { visits: 0, total: 0 };
    existing.visits += 1;
    existing.total += chargePerVisit;
    brandStats.set(visit.brand_id, existing);
  }

  // Format results
  return Array.from(brandStats.entries())
    .map(([brand_id, stats]) => {
      const brandInfo = brandMap.get(brand_id)!;
      return {
        brand_id,
        brand_name: brandInfo.name,
        total_visits: stats.visits,
        total_charge: stats.total,
        price_per_visit: brandInfo.price_per_visit,
      };
    })
    .sort((a, b) => b.total_charge - a.total_charge);
}

// Report by Store
export async function getStoreReport(
  agencyId: string,
  startDate?: string,
  endDate?: string,
): Promise<StoreReportItem[]> {
  // Get all stores for this agency
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, chain_name, address")
    .eq("agency_id", agencyId);

  if (storesError) {
    console.error("Error fetching stores:", storesError);
    return [];
  }

  if (!stores || stores.length === 0) {
    return [];
  }

  const storeIds = stores.map((s) => s.id);
  const storeMap = new Map(
    stores.map((s) => [
      s.id,
      {
        name: s.chain_name,
        address: s.address,
      },
    ]),
  );

  // Get all promoters for this agency to get payment rates
  const { data: promoters } = await supabase
    .from("promoters")
    .select("id, payment_per_visit, user:users!inner(agency_id)")
    .eq("user.agency_id", agencyId)
    .eq("active", true);

  const promoterPaymentMap = new Map(
    (promoters || []).map((p) => [
      p.id,
      parseFloat(p.payment_per_visit || "0"),
    ]),
  );

  // Get visits with brand and promoter info
  let visitQuery = supabase
    .from("visits")
    .select(
      "id, store_id, brand_id, promoter_id, timestamp, brands(price_per_visit)",
    )
    .in("store_id", storeIds);

  if (startDate) {
    visitQuery = visitQuery.gte("timestamp", normalizeStartDate(startDate));
  }
  if (endDate) {
    visitQuery = visitQuery.lte("timestamp", normalizeEndDate(endDate));
  }

  const { data: visits, error: visitsError } = await visitQuery;

  if (visitsError) {
    console.error("Error fetching visits:", visitsError);
    return stores.map((s) => ({
      store_id: s.id,
      store_name: s.chain_name,
      store_address: s.address,
      total_visits: 0,
      total_promoter_payments: 0,
      total_brand_charges: 0,
      gross_margin: 0,
    }));
  }

  if (!visits || visits.length === 0) {
    return stores.map((s) => ({
      store_id: s.id,
      store_name: s.chain_name,
      store_address: s.address,
      total_visits: 0,
      total_promoter_payments: 0,
      total_brand_charges: 0,
      gross_margin: 0,
    }));
  }

  // Group visits by store
  const storeStats = new Map<
    string,
    {
      visits: number;
      promoter_payments: number;
      brand_charges: number;
    }
  >();

  for (const visit of visits) {
    const storeInfo = storeMap.get(visit.store_id);
    if (!storeInfo) continue;

    const paymentPerVisit = promoterPaymentMap.get(visit.promoter_id) || 0;
    const chargePerVisit = parseFloat(
      (visit.brands as any)?.price_per_visit || "0",
    );

    const existing = storeStats.get(visit.store_id) || {
      visits: 0,
      promoter_payments: 0,
      brand_charges: 0,
    };
    existing.visits += 1;
    existing.promoter_payments += paymentPerVisit;
    existing.brand_charges += chargePerVisit;
    storeStats.set(visit.store_id, existing);
  }

  // Format results
  return Array.from(storeStats.entries())
    .map(([store_id, stats]) => {
      const storeInfo = storeMap.get(store_id)!;
      return {
        store_id,
        store_name: storeInfo.name,
        store_address: storeInfo.address,
        total_visits: stats.visits,
        total_promoter_payments: stats.promoter_payments,
        total_brand_charges: stats.brand_charges,
        gross_margin: stats.brand_charges - stats.promoter_payments,
      };
    })
    .sort((a, b) => b.total_visits - a.total_visits);
}

// To Be Paid (Promoters)
export async function getToBePaidReport(
  agencyId: string,
  startDate?: string,
  endDate?: string,
): Promise<ToBePaidItem[]> {
  // Get all promoters with phone - first get user IDs
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("agency_id", agencyId);

  if (!users || users.length === 0) {
    return [];
  }

  const userIds = users.map((u) => u.id);

  // Then get promoters
  const { data: promoters, error: promotersError } = await supabase
    .from("promoters")
    .select("id, name, phone, payment_per_visit, user_id")
    .in("user_id", userIds)
    .eq("active", true);

  if (promotersError) {
    console.error("Error fetching promoters:", promotersError);
    return [];
  }

  if (!promoters || promoters.length === 0) {
    return [];
  }

  // Get user emails separately
  const { data: userEmails } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const emailMap = new Map((userEmails || []).map((u) => [u.id, u.email]));

  const promoterIds = promoters.map((p) => p.id);
  const promoterMap = new Map(
    promoters.map((p) => [
      p.id,
      {
        name: p.name,
        email: emailMap.get(p.user_id) || "",
        phone: p.phone || "",
        payment_per_visit: parseFloat(p.payment_per_visit || "0"),
      },
    ]),
  );

  // Get visits
  let visitQuery = supabase
    .from("visits")
    .select("id, promoter_id, timestamp")
    .in("promoter_id", promoterIds);

  if (startDate) {
    visitQuery = visitQuery.gte("timestamp", normalizeStartDate(startDate));
  }
  if (endDate) {
    visitQuery = visitQuery.lte("timestamp", normalizeEndDate(endDate));
  }

  const { data: visits, error: visitsError } = await visitQuery;

  if (visitsError) {
    console.error("Error fetching visits:", visitsError);
    return promoters.map((p) => ({
      promoter_id: p.id,
      promoter_name: p.name,
      promoter_email: emailMap.get(p.user_id) || "",
      promoter_phone: p.phone || "",
      total_visits: 0,
      total_amount: 0,
      payment_per_visit: parseFloat(p.payment_per_visit || "0"),
    }));
  }

  // Group by promoter
  const promoterStats = new Map<string, { visits: number; total: number }>();

  for (const visit of visits || []) {
    const promoterInfo = promoterMap.get(visit.promoter_id);
    if (!promoterInfo) continue;

    const paymentPerVisit = promoterInfo.payment_per_visit;
    const existing = promoterStats.get(visit.promoter_id) || {
      visits: 0,
      total: 0,
    };
    existing.visits += 1;
    existing.total += paymentPerVisit;
    promoterStats.set(visit.promoter_id, existing);
  }

  // Create promoter map for easy lookup
  const promoterInfoMap = new Map(
    promoters.map((p) => [
      p.id,
      {
        name: p.name,
        email: emailMap.get(p.user_id) || "",
        phone: p.phone || "",
        payment_per_visit: parseFloat(p.payment_per_visit || "0"),
      },
    ]),
  );

  // Format results - include promoters with 0 visits
  const resultMap = new Map<string, ToBePaidItem>();

  // Add promoters with visits
  Array.from(promoterStats.entries()).forEach(([promoter_id, stats]) => {
    const promoterInfo = promoterInfoMap.get(promoter_id);
    if (promoterInfo) {
      resultMap.set(promoter_id, {
        promoter_id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        promoter_phone: promoterInfo.phone,
        total_visits: stats.visits,
        total_amount: stats.total,
        payment_per_visit: promoterInfo.payment_per_visit,
      });
    }
  });

  // Add promoters without visits
  promoters.forEach((p) => {
    if (!resultMap.has(p.id)) {
      const promoterInfo = promoterInfoMap.get(p.id)!;
      resultMap.set(p.id, {
        promoter_id: p.id,
        promoter_name: promoterInfo.name,
        promoter_email: promoterInfo.email,
        promoter_phone: promoterInfo.phone,
        total_visits: 0,
        total_amount: 0,
        payment_per_visit: promoterInfo.payment_per_visit,
      });
    }
  });

  return Array.from(resultMap.values()).sort(
    (a, b) => b.total_amount - a.total_amount,
  );
}

// To Be Received (Brands)
export async function getToBeReceivedReport(
  agencyId: string,
  startDate?: string,
  endDate?: string,
): Promise<ToBeReceivedItem[]> {
  const brandReport = await getBrandReport(agencyId, startDate, endDate);

  return brandReport.map((item) => ({
    brand_id: item.brand_id,
    brand_name: item.brand_name,
    total_visits: item.total_visits,
    total_amount: item.total_charge,
    price_per_visit: item.price_per_visit,
  }));
}
