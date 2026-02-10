import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest, getEffectiveAgencyId } from '../middleware/auth.js';

export async function listPromoters(req: AuthRequest, res: Response) {
  const agencyId = getEffectiveAgencyId(req, req.query.agency_id as string | undefined);

  let query = supabase
    .from('promoters')
    .select(`*, user:users(id, email, role, agency_id)`);
  if (agencyId) {
    query = query.eq('user.agency_id', agencyId);
  }
  const { data: promoters, error } = await query;

  if (error) {
    throw new AppError(`Failed to fetch promoters: ${error.message}`, 500);
  }

  // Get brands and stores for each promoter
  if (promoters && promoters.length > 0) {
    const promoterIds = promoters.map(p => p.id);
    
    const [brandsResult, storesResult] = await Promise.all([
      supabase
        .from('promoter_brands')
        .select('promoter_id, brand_id')
        .in('promoter_id', promoterIds),
      supabase
        .from('promoter_stores')
        .select('promoter_id, store_id')
        .in('promoter_id', promoterIds)
    ]);

    // Map relationships to promoters
    const promotersWithRelations = promoters.map(promoter => ({
      ...promoter,
      brands: (brandsResult.data || []).filter((pb: any) => pb.promoter_id === promoter.id),
      stores: (storesResult.data || []).filter((ps: any) => ps.promoter_id === promoter.id)
    }));

    res.json(promotersWithRelations);
  } else {
    res.json([]);
  }
}

export async function createPromoter(req: AuthRequest, res: Response) {
  const { agency_id: bodyAgencyId, email, password, name, phone, city, brand_ids, store_ids, availability_days, payment_per_visit } = req.body;
  const agencyId = req.user?.role === 'system_admin' ? bodyAgencyId : req.agencyId;
  if (!agencyId) {
    throw new AppError('Agency scope required (agency_id for system_admin)', 400);
  }

  if (!email || !password || !name || !phone || !city) {
    throw new AppError('Missing required fields', 400);
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      password_hash,
      role: 'promoter',
      agency_id: agencyId
    })
    .select()
    .single();

  if (userError || !user) {
    throw new AppError('Failed to create user', 500);
  }

  // Create promoter
  const { data: promoter, error: promoterError } = await supabase
    .from('promoters')
    .insert({
      user_id: user.id,
      name,
      phone,
      city,
      availability_days: availability_days || [],
      payment_per_visit: payment_per_visit || 0,
      active: true
    })
    .select()
    .single();

  if (promoterError || !promoter) {
    // Rollback: delete user
    await supabase.from('users').delete().eq('id', user.id);
    throw new AppError('Failed to create promoter', 500);
  }

  // Assign brands if provided
  if (brand_ids && Array.isArray(brand_ids) && brand_ids.length > 0) {
    const brandAssignments = brand_ids.map((brand_id: string) => ({
      promoter_id: promoter.id,
      brand_id
    }));
    await supabase.from('promoter_brands').insert(brandAssignments);
  }

  // Assign stores if provided
  if (store_ids && Array.isArray(store_ids) && store_ids.length > 0) {
    const storeAssignments = store_ids.map((store_id: string) => ({
      promoter_id: promoter.id,
      store_id
    }));
    await supabase.from('promoter_stores').insert(storeAssignments);
  }

  res.status(201).json(promoter);
}

export async function getPromoter(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: promoter, error } = await supabase
    .from('promoters')
    .select(`*, user:users!inner(id, email, role, agency_id)`)
    .eq('id', id)
    .single();

  if (error || !promoter) {
    throw new AppError('Promoter not found', 404);
  }
  if (req.user?.role !== 'system_admin' && (promoter.user as any).agency_id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  // Get assigned brands and stores
  const [brandsResult, storesResult] = await Promise.all([
    supabase
      .from('promoter_brands')
      .select('brand_id, brands(*)')
      .eq('promoter_id', id),
    supabase
      .from('promoter_stores')
      .select('store_id, stores(*)')
      .eq('promoter_id', id)
  ]);

  res.json({
    ...promoter,
    brands: brandsResult.data || [],
    stores: storesResult.data || []
  });
}

export async function updatePromoter(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  const { data: promoter } = await supabase
    .from('promoters')
    .select('user:users!inner(agency_id)')
    .eq('id', id)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }
  if (req.user?.role !== 'system_admin' && (promoter.user as any).agency_id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  // Update promoter
  const { data: updated, error } = await supabase
    .from('promoters')
    .update({
      name: updates.name,
      phone: updates.phone,
      city: updates.city,
      availability_days: updates.availability_days,
      payment_per_visit: updates.payment_per_visit,
      visit_frequency_per_brand: updates.visit_frequency_per_brand
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update promoter: ${error.message}`, 500);
  }

  // Update brand assignments if provided
  if (updates.brand_ids) {
    await supabase.from('promoter_brands').delete().eq('promoter_id', id);
    if (updates.brand_ids.length > 0) {
      const assignments = updates.brand_ids.map((brand_id: string) => ({
        promoter_id: id,
        brand_id
      }));
      await supabase.from('promoter_brands').insert(assignments);
    }
  }

  // Update store assignments if provided
  if (updates.store_ids) {
    await supabase.from('promoter_stores').delete().eq('promoter_id', id);
    if (updates.store_ids.length > 0) {
      const assignments = updates.store_ids.map((store_id: string) => ({
        promoter_id: id,
        store_id
      }));
      await supabase.from('promoter_stores').insert(assignments);
    }
  }

  res.json(updated);
}

export async function toggleActive(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: promoter } = await supabase
    .from('promoters')
    .select('active, user:users!inner(agency_id)')
    .eq('id', id)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }
  if (req.user?.role !== 'system_admin' && (promoter.user as any).agency_id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  const { data: updated, error } = await supabase
    .from('promoters')
    .update({ active: !promoter.active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update promoter: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function getMyEarnings(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  // Get promoter with payment info
  const { data: promoter } = await supabase
    .from('promoters')
    .select('id, payment_per_visit')
    .eq('user_id', userId)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }

  const paymentPerVisit = parseFloat(promoter.payment_per_visit || '0');

  // Get all visits for this promoter
  const { data: visits, error } = await supabase
    .from('visits')
    .select('id, timestamp, brand_id, store_id, brands(name), stores(chain_name)')
    .eq('promoter_id', promoter.id)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch visits: ${error.message}`, 500);
  }

  const totalVisits = visits?.length || 0;
  const totalEarnings = totalVisits * paymentPerVisit;

  // Calculate earnings by period
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthVisits = visits?.filter(v => new Date(v.timestamp) >= thisMonthStart) || [];
  const lastMonthVisits = visits?.filter(v => {
    const visitDate = new Date(v.timestamp);
    return visitDate >= lastMonthStart && visitDate <= lastMonthEnd;
  }) || [];

  const thisMonthEarnings = thisMonthVisits.length * paymentPerVisit;
  const lastMonthEarnings = lastMonthVisits.length * paymentPerVisit;

  // Calculate earnings by brand
  const earningsByBrand = new Map<string, { brandName: string; visits: number; earnings: number }>();
  
  visits?.forEach(visit => {
    const brandId = visit.brand_id;
    const brandName = (visit.brands as any)?.name || 'Unknown';
    const existing = earningsByBrand.get(brandId) || { brandName, visits: 0, earnings: 0 };
    existing.visits += 1;
    existing.earnings += paymentPerVisit;
    earningsByBrand.set(brandId, existing);
  });

  res.json({
    payment_per_visit: paymentPerVisit,
    total_visits: totalVisits,
    total_earnings: totalEarnings,
    this_month: {
      visits: thisMonthVisits.length,
      earnings: thisMonthEarnings
    },
    last_month: {
      visits: lastMonthVisits.length,
      earnings: lastMonthEarnings
    },
    by_brand: Array.from(earningsByBrand.values())
  });
}
