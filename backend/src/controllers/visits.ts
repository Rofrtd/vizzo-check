import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { validateGPS } from '../services/gpsValidation.js';
import { CreateVisitRequest } from '@vizzocheck/shared';

export async function listVisits(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const { startDate, endDate, promoter_id, store_id, brand_id, status } = req.query;

  let query = supabase
    .from('visits')
    .select(`
      *,
      promoter:promoters(id, name, phone, city, photo_url),
      store:stores(id, chain_name, address, gps_latitude, gps_longitude, logo_url),
      brand:brands(id, name, logo_url)
    `)
    .order('timestamp', { ascending: false });

  // Filter by agency (through promoter)
  const { data: promoters } = await supabase
    .from('promoters')
    .select('id, user:users!inner(agency_id)')
    .eq('user.agency_id', agencyId);

  const promoterIds = promoters?.map(p => p.id) || [];
  if (promoterIds.length === 0) {
    return res.json([]);
  }

  query = query.in('promoter_id', promoterIds);

  if (startDate) {
    // Ensure startDate includes the entire day (from 00:00:00)
    const startDateTime = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
    query = query.gte('timestamp', startDateTime);
  }
  if (endDate) {
    // Ensure endDate includes the entire day (until 23:59:59)
    const endDateTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
    query = query.lte('timestamp', endDateTime);
  }
  if (promoter_id) {
    query = query.eq('promoter_id', promoter_id as string);
  }
  if (store_id) {
    query = query.eq('store_id', store_id as string);
  }
  if (brand_id) {
    query = query.eq('brand_id', brand_id as string);
  }
  if (status) {
    query = query.eq('status', status as string);
  }

  const { data: visits, error } = await query;

  if (error) {
    throw new AppError(`Failed to fetch visits: ${error.message}`, 500);
  }

  // Enrich visits with full promoter, store, and brand data including images (batch queries)
  if (visits && visits.length > 0) {
    // Get unique IDs
    const promoterIds = [...new Set(visits.map((v: any) => v.promoter_id))];
    const storeIds = [...new Set(visits.map((v: any) => v.store_id))];
    const brandIds = [...new Set(visits.map((v: any) => v.brand_id))];

    // Fetch all related data in parallel
    const [promotersResult, storesResult, brandsResult] = await Promise.all([
      supabase
        .from('promoters')
        .select('id, name, phone, city, photo_url')
        .in('id', promoterIds),
      supabase
        .from('stores')
        .select('id, chain_name, address, gps_latitude, gps_longitude, logo_url')
        .in('id', storeIds),
      supabase
        .from('brands')
        .select('id, name, logo_url')
        .in('id', brandIds)
    ]);

    // Create maps for quick lookup
    const promoterMap = new Map((promotersResult.data || []).map((p: any) => [p.id, p]));
    const storeMap = new Map((storesResult.data || []).map((s: any) => [s.id, s]));
    const brandMap = new Map((brandsResult.data || []).map((b: any) => [b.id, b]));

    // Enrich visits
    const enrichedVisits = visits.map((visit: any) => ({
      ...visit,
      promoter: promoterMap.get(visit.promoter_id) || visit.promoter,
      store: storeMap.get(visit.store_id) || visit.store,
      brand: brandMap.get(visit.brand_id) || visit.brand
    }));

    res.json(enrichedVisits);
  } else {
    res.json([]);
  }
}

export async function createVisit(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const agencyId = req.agencyId!;
  const visitData = req.body as CreateVisitRequest;

  // Get promoter
  const { data: promoter } = await supabase
    .from('promoters')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }

  // Verify promoter is authorized for store and brand
  const [storeAuth, brandAuth] = await Promise.all([
    supabase
      .from('promoter_stores')
      .select('store_id')
      .eq('promoter_id', promoter.id)
      .eq('store_id', visitData.store_id)
      .single(),
    supabase
      .from('promoter_brands')
      .select('brand_id')
      .eq('promoter_id', promoter.id)
      .eq('brand_id', visitData.brand_id)
      .single()
  ]);

  if (!storeAuth.data || !brandAuth.data) {
    throw new AppError('Promoter not authorized for this store or brand', 403);
  }

  // Get store for GPS validation
  const { data: store } = await supabase
    .from('stores')
    .select('gps_latitude, gps_longitude, radius_meters')
    .eq('id', visitData.store_id)
    .single();

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  // Validate GPS
  const isGPSValid = validateGPS(
    visitData.gps_latitude,
    visitData.gps_longitude,
    store.gps_latitude,
    store.gps_longitude,
    store.radius_meters
  );

  if (!isGPSValid) {
    throw new AppError('GPS coordinates are not within store radius', 400);
  }

  // Get brand products
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('brand_id', visitData.brand_id);

  if (!products || products.length === 0) {
    throw new AppError('Brand has no products', 400);
  }

  // Validate all products are included
  const visitProductIds = visitData.products.map(p => p.product_id);
  const brandProductIds = products.map(p => p.id);
  const missingProducts = brandProductIds.filter(id => !visitProductIds.includes(id));

  if (missingProducts.length > 0) {
    throw new AppError('All brand products must be included in visit', 400);
  }

  // Create visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      promoter_id: promoter.id,
      store_id: visitData.store_id,
      brand_id: visitData.brand_id,
      gps_latitude: visitData.gps_latitude,
      gps_longitude: visitData.gps_longitude,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: visitData.notes
    })
    .select()
    .single();

  if (visitError || !visit) {
    throw new AppError('Failed to create visit', 500);
  }

  // Create visit products (photos will be uploaded and updated separately)
  const visitProducts = visitData.products.map(vp => ({
    visit_id: visit.id,
    product_id: vp.product_id,
    quantity: vp.quantity,
    photo_before_url: vp.photo_before || null, // Will be updated after upload
    photo_after_url: vp.photo_after || null, // Will be updated after upload
    notes: vp.notes || null
  }));

  const { error: productsError } = await supabase
    .from('visit_products')
    .insert(visitProducts);

  if (productsError) {
    // Rollback: delete visit
    await supabase.from('visits').delete().eq('id', visit.id);
    throw new AppError(`Failed to create visit products: ${productsError.message}`, 500);
  }

  res.status(201).json(visit);
}

export async function getVisit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;

  // Get visit with related data
  const { data: visit, error } = await supabase
    .from('visits')
    .select(`
      *,
      promoter:promoters(id, name, phone, city, user:users!inner(agency_id))
    `)
    .eq('id', id)
    .single();

  if (error || !visit) {
    throw new AppError('Visit not found', 404);
  }

  // Verify agency access
  if ((visit.promoter as any).user.agency_id !== agencyId) {
    throw new AppError('Forbidden', 403);
  }

  // Get visit products
  const { data: visitProducts } = await supabase
    .from('visit_products')
    .select(`
      *,
      product:products(*)
    `)
    .eq('visit_id', id);

  // Get store and brand
  const [storeResult, brandResult] = await Promise.all([
    supabase.from('stores').select('*').eq('id', visit.store_id).single(),
    supabase.from('brands').select('*').eq('id', visit.brand_id).single()
  ]);

  res.json({
    ...visit,
    store: storeResult.data,
    brand: brandResult.data,
    products: visitProducts || []
  });
}

export async function updateVisit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;
  const updates = req.body;

  // Verify visit belongs to agency
  const { data: visit } = await supabase
    .from('visits')
    .select('promoter:promoters(user:users!inner(agency_id))')
    .eq('id', id)
    .single();

  if (!visit || (visit.promoter as any).user.agency_id !== agencyId) {
    throw new AppError('Visit not found', 404);
  }

  const { data: updated, error } = await supabase
    .from('visits')
    .update({
      notes: updates.notes,
      status: 'edited'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update visit: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function updateVisitProductPhotos(req: AuthRequest, res: Response) {
  const { visitId, productId } = req.params;
  const { photo_before_url, photo_after_url, notes } = req.body;
  const agencyId = req.agencyId!;

  // Verify visit belongs to agency
  const { data: visit } = await supabase
    .from('visits')
    .select('promoter:promoters(user:users!inner(agency_id))')
    .eq('id', visitId)
    .single();

  if (!visit || (visit.promoter as any).user.agency_id !== agencyId) {
    throw new AppError('Visit not found', 404);
  }

  // Update visit product photos and notes
  const updateData: any = {};
  if (photo_before_url) updateData.photo_before_url = photo_before_url;
  if (photo_after_url) updateData.photo_after_url = photo_after_url;
  if (notes !== undefined) updateData.notes = notes || null;

  const { data: updated, error } = await supabase
    .from('visit_products')
    .update(updateData)
    .eq('visit_id', visitId)
    .eq('product_id', productId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update visit product: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function getMyVisits(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  // Get promoter
  const { data: promoter } = await supabase
    .from('promoters')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }

  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      *,
      store:stores(id, chain_name, address),
      brand:brands(id, name)
    `)
    .eq('promoter_id', promoter.id)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch visits: ${error.message}`, 500);
  }

  // Get products for each visit
  if (visits && visits.length > 0) {
    const visitIds = visits.map(v => v.id);
    const { data: visitProducts } = await supabase
      .from('visit_products')
      .select(`
        *,
        product:products(id, name, code)
      `)
      .in('visit_id', visitIds);

    // Attach products to visits
    const visitsWithProducts = visits.map(visit => ({
      ...visit,
      products: visitProducts?.filter(vp => vp.visit_id === visit.id) || []
    }));

    res.json(visitsWithProducts);
  } else {
    res.json([]);
  }
}
