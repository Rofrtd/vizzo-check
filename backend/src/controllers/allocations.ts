import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { getSuggestedDays } from '../services/allocationSuggestions.js';

export async function listAllocations(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;

  // Get user IDs for this agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    return res.json([]);
  }

  const userIds = users.map(u => u.id);

  // Get all allocations
  const { data: allocations, error } = await supabase
    .from('promoter_allocations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch allocations: ${error.message}`, 500);
  }

  if (!allocations || allocations.length === 0) {
    return res.json([]);
  }

  // Get promoter IDs from allocations
  const promoterIds = [...new Set(allocations.map((a: any) => a.promoter_id))];
  const brandIds = [...new Set(allocations.map((a: any) => a.brand_id))];
  const storeIds = [...new Set(allocations.map((a: any) => a.store_id))];

  // Fetch promoters, brands, and stores in parallel
  const [promotersResult, brandsResult, storesResult] = await Promise.all([
    supabase
      .from('promoters')
      .select('id, name, user_id')
      .in('id', promoterIds),
    supabase
      .from('brands')
      .select('id, name, agency_id')
      .in('id', brandIds)
      .eq('agency_id', agencyId),
    supabase
      .from('stores')
      .select('id, chain_name, agency_id')
      .in('id', storeIds)
      .eq('agency_id', agencyId)
  ]);

  // Create maps for quick lookup
  const promoterMap = new Map((promotersResult.data || []).map((p: any) => [p.id, p]));
  const brandMap = new Map((brandsResult.data || []).map((b: any) => [b.id, b]));
  const storeMap = new Map((storesResult.data || []).map((s: any) => [s.id, s]));

  // Filter allocations that belong to this agency
  const filteredAllocations = allocations.filter((alloc: any) => {
    const promoter = promoterMap.get(alloc.promoter_id);
    const brand = brandMap.get(alloc.brand_id);
    const store = storeMap.get(alloc.store_id);

    // Check if promoter's user belongs to agency
    if (!promoter || !userIds.includes(promoter.user_id)) return false;
    if (!brand || brand.agency_id !== agencyId) return false;
    if (!store || store.agency_id !== agencyId) return false;

    return true;
  });

  // Format response
  const formatted = filteredAllocations.map((alloc: any) => {
    const promoter = promoterMap.get(alloc.promoter_id);
    const brand = brandMap.get(alloc.brand_id);
    const store = storeMap.get(alloc.store_id);

    return {
      id: alloc.id,
      promoter_id: alloc.promoter_id,
      promoter_name: promoter?.name || '',
      brand_id: alloc.brand_id,
      brand_name: brand?.name || '',
      store_id: alloc.store_id,
      store_name: store?.chain_name || '',
      days_of_week: alloc.days_of_week || [],
      frequency_per_week: alloc.frequency_per_week,
      active: alloc.active,
      created_at: alloc.created_at,
      updated_at: alloc.updated_at
    };
  });

  res.json(formatted);
}

export async function getAllocation(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;

  // Get user IDs for this agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Allocation not found', 404);
  }

  const userIds = users.map(u => u.id);

  const { data: allocation, error } = await supabase
    .from('promoter_allocations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !allocation) {
    throw new AppError('Allocation not found', 404);
  }

  // Fetch related data
  const [promoterResult, brandResult, storeResult] = await Promise.all([
    supabase
      .from('promoters')
      .select('id, name, user_id')
      .eq('id', allocation.promoter_id)
      .single(),
    supabase
      .from('brands')
      .select('id, name, agency_id')
      .eq('id', allocation.brand_id)
      .eq('agency_id', agencyId)
      .single(),
    supabase
      .from('stores')
      .select('id, chain_name, agency_id')
      .eq('id', allocation.store_id)
      .eq('agency_id', agencyId)
      .single()
  ]);

  const promoter = promoterResult.data;
  const brand = brandResult.data;
  const store = storeResult.data;

  // Verify agency ownership
  if (!promoter || !userIds.includes(promoter.user_id) ||
      !brand || brand.agency_id !== agencyId ||
      !store || store.agency_id !== agencyId) {
    throw new AppError('Allocation not found', 404);
  }

  res.json({
    id: allocation.id,
    promoter_id: allocation.promoter_id,
    promoter_name: promoter.name || '',
    brand_id: allocation.brand_id,
    brand_name: brand.name || '',
    store_id: allocation.store_id,
    store_name: store.chain_name || '',
    days_of_week: allocation.days_of_week || [],
    frequency_per_week: allocation.frequency_per_week,
    active: allocation.active,
    created_at: allocation.created_at,
    updated_at: allocation.updated_at
  });
}

export async function createAllocation(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const { promoter_id, brand_id, store_id, days_of_week, frequency_per_week, active } = req.body;

  // Validate required fields
  if (!promoter_id || !brand_id || !store_id || !days_of_week || !Array.isArray(days_of_week)) {
    throw new AppError('Missing required fields', 400);
  }

  // Validate days_of_week
  if (days_of_week.length === 0) {
    throw new AppError('At least one day must be selected', 400);
  }

  if (days_of_week.some((day: number) => day < 0 || day > 6)) {
    throw new AppError('Invalid day value. Days must be between 0 (Sunday) and 6 (Saturday)', 400);
  }

  // Validate frequency matches number of days
  const freq = frequency_per_week || days_of_week.length;
  if (freq !== days_of_week.length) {
    throw new AppError(`Frequency per week (${freq}) must match number of selected days (${days_of_week.length})`, 400);
  }

  // Verify promoter belongs to agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Invalid agency', 400);
  }

  const userIds = users.map(u => u.id);

  const { data: promoter } = await supabase
    .from('promoters')
    .select('user_id')
    .eq('id', promoter_id)
    .single();

  if (!promoter || !userIds.includes(promoter.user_id)) {
    throw new AppError('Promoter not found or does not belong to your agency', 404);
  }

  // Verify brand belongs to agency
  const { data: brand } = await supabase
    .from('brands')
    .select('agency_id')
    .eq('id', brand_id)
    .single();

  if (!brand || brand.agency_id !== agencyId) {
    throw new AppError('Brand not found or does not belong to your agency', 404);
  }

  // Verify store belongs to agency
  const { data: store } = await supabase
    .from('stores')
    .select('agency_id')
    .eq('id', store_id)
    .single();

  if (!store || store.agency_id !== agencyId) {
    throw new AppError('Store not found or does not belong to your agency', 404);
  }

  // Verify promoter is authorized for brand and store
  const [brandAuth, storeAuth] = await Promise.all([
    supabase
      .from('promoter_brands')
      .select('promoter_id')
      .eq('promoter_id', promoter_id)
      .eq('brand_id', brand_id)
      .single(),
    supabase
      .from('promoter_stores')
      .select('promoter_id')
      .eq('promoter_id', promoter_id)
      .eq('store_id', store_id)
      .single()
  ]);

  if (!brandAuth.data) {
    throw new AppError('Promoter is not authorized for this brand', 400);
  }

  if (!storeAuth.data) {
    throw new AppError('Promoter is not authorized for this store', 400);
  }

  // Verify brand is present in store
  const { data: brandStore } = await supabase
    .from('brand_stores')
    .select('brand_id')
    .eq('brand_id', brand_id)
    .eq('store_id', store_id)
    .single();

  if (!brandStore) {
    throw new AppError('Brand is not present in this store', 400);
  }

  // Check if allocation already exists
  const { data: existing } = await supabase
    .from('promoter_allocations')
    .select('id')
    .eq('promoter_id', promoter_id)
    .eq('brand_id', brand_id)
    .eq('store_id', store_id)
    .single();

  if (existing) {
    throw new AppError('Allocation already exists for this promoter-brand-store combination', 400);
  }

  // Create allocation
  const { data: allocation, error } = await supabase
    .from('promoter_allocations')
    .insert({
      promoter_id,
      brand_id,
      store_id,
      days_of_week: days_of_week.sort((a: number, b: number) => a - b),
      frequency_per_week: freq,
      active: active !== undefined ? active : true
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create allocation: ${error.message}`, 500);
  }

  res.status(201).json(allocation);
}

export async function updateAllocation(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;
  const { days_of_week, frequency_per_week, active } = req.body;

  // Verify allocation belongs to agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Allocation not found', 404);
  }

  const userIds = users.map(u => u.id);

  const { data: allocation } = await supabase
    .from('promoter_allocations')
    .select('*')
    .eq('id', id)
    .single();

  if (!allocation) {
    throw new AppError('Allocation not found', 404);
  }

  // Verify agency ownership
  const [promoterResult, brandResult, storeResult] = await Promise.all([
    supabase
      .from('promoters')
      .select('user_id')
      .eq('id', allocation.promoter_id)
      .single(),
    supabase
      .from('brands')
      .select('agency_id')
      .eq('id', allocation.brand_id)
      .single(),
    supabase
      .from('stores')
      .select('agency_id')
      .eq('id', allocation.store_id)
      .single()
  ]);

  const promoter = promoterResult.data;
  const brand = brandResult.data;
  const store = storeResult.data;

  if (!promoter || !userIds.includes(promoter.user_id) ||
      !brand || brand.agency_id !== agencyId ||
      !store || store.agency_id !== agencyId) {
    throw new AppError('Allocation not found', 404);
  }

  // Prepare update data
  const updates: any = {};

  if (days_of_week !== undefined) {
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      throw new AppError('At least one day must be selected', 400);
    }

    if (days_of_week.some((day: number) => day < 0 || day > 6)) {
      throw new AppError('Invalid day value. Days must be between 0 (Sunday) and 6 (Saturday)', 400);
    }

    updates.days_of_week = days_of_week.sort((a: number, b: number) => a - b);
  }

  if (frequency_per_week !== undefined) {
    const days = updates.days_of_week || allocation.days_of_week;
    if (frequency_per_week !== days.length) {
      throw new AppError(`Frequency per week (${frequency_per_week}) must match number of selected days (${days.length})`, 400);
    }
    updates.frequency_per_week = frequency_per_week;
  }

  if (active !== undefined) {
    updates.active = active;
  }

  // Update allocation
  const { data: updated, error } = await supabase
    .from('promoter_allocations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update allocation: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function deleteAllocation(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;

  // Verify allocation belongs to agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Allocation not found', 404);
  }

  const userIds = users.map(u => u.id);

  const { data: allocation } = await supabase
    .from('promoter_allocations')
    .select('*')
    .eq('id', id)
    .single();

  if (!allocation) {
    throw new AppError('Allocation not found', 404);
  }

  // Verify agency ownership
  const [promoterResult, brandResult, storeResult] = await Promise.all([
    supabase
      .from('promoters')
      .select('user_id')
      .eq('id', allocation.promoter_id)
      .single(),
    supabase
      .from('brands')
      .select('agency_id')
      .eq('id', allocation.brand_id)
      .single(),
    supabase
      .from('stores')
      .select('agency_id')
      .eq('id', allocation.store_id)
      .single()
  ]);

  const promoter = promoterResult.data;
  const brand = brandResult.data;
  const store = storeResult.data;

  if (!promoter || !userIds.includes(promoter.user_id) ||
      !brand || brand.agency_id !== agencyId ||
      !store || store.agency_id !== agencyId) {
    throw new AppError('Allocation not found', 404);
  }

  const { error } = await supabase
    .from('promoter_allocations')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError(`Failed to delete allocation: ${error.message}`, 500);
  }

  res.json({ message: 'Allocation deleted successfully' });
}

export async function getSuggestions(req: AuthRequest, res: Response) {
  const { promoterId, brandId, storeId } = req.params;
  const agencyId = req.agencyId!;
  const frequencyPerWeek = parseInt(req.query.frequency as string) || 1;

  // Verify all entities belong to agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Invalid agency', 400);
  }

  const userIds = users.map(u => u.id);

  // Verify promoter
  const { data: promoter } = await supabase
    .from('promoters')
    .select('user_id')
    .eq('id', promoterId)
    .single();

  if (!promoter || !userIds.includes(promoter.user_id)) {
    throw new AppError('Promoter not found', 404);
  }

  // Verify brand
  const { data: brand } = await supabase
    .from('brands')
    .select('agency_id')
    .eq('id', brandId)
    .single();

  if (!brand || brand.agency_id !== agencyId) {
    throw new AppError('Brand not found', 404);
  }

  // Verify store
  const { data: store } = await supabase
    .from('stores')
    .select('agency_id')
    .eq('id', storeId)
    .single();

  if (!store || store.agency_id !== agencyId) {
    throw new AppError('Store not found', 404);
  }

  try {
    const suggestions = await getSuggestedDays(promoterId, brandId, storeId, frequencyPerWeek);
    res.json(suggestions);
  } catch (error: any) {
    throw new AppError(`Failed to get suggestions: ${error.message}`, 500);
  }
}
