import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest, getEffectiveAgencyId } from '../middleware/auth.js';

export async function listStores(req: AuthRequest, res: Response) {
  const agencyId = getEffectiveAgencyId(req, req.query.agency_id as string | undefined);

  let query = supabase.from('stores').select('*').order('chain_name');
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: stores, error } = await query;

  if (error) {
    throw new AppError(`Failed to fetch stores: ${error.message}`, 500);
  }

  res.json(stores || []);
}

export async function createStore(req: AuthRequest, res: Response) {
  const { agency_id: bodyAgencyId, chain_name, type, address, gps_latitude, gps_longitude, radius_meters, shelf_layout_pdf_url, product_category, contacts } = req.body;
  const agencyId = req.user?.role === 'system_admin' ? bodyAgencyId : req.agencyId;
  if (!agencyId) {
    throw new AppError('Agency scope required (agency_id for system_admin)', 400);
  }

  if (!chain_name || !type || !address || gps_latitude === undefined || gps_longitude === undefined) {
    throw new AppError('Missing required fields', 400);
  }

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      agency_id: agencyId,
      chain_name,
      type,
      address,
      gps_latitude,
      gps_longitude,
      radius_meters: radius_meters || 200,
      shelf_layout_pdf_url,
      product_category
    })
    .select()
    .single();

  if (error || !store) {
    throw new AppError('Failed to create store', 500);
  }

  // Add contacts if provided
  if (contacts && Array.isArray(contacts)) {
    const contactRecords = contacts.map((contact: any) => ({
      store_id: store.id,
      name: contact.name,
      phone: contact.phone,
      role: contact.role
    }));
    await supabase.from('store_contacts').insert(contactRecords);
  }

  res.status(201).json(store);
}

export async function getStore(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !store) {
    throw new AppError('Store not found', 404);
  }

  if (req.user?.role !== 'system_admin' && store.agency_id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  // Get contacts
  const { data: contacts } = await supabase
    .from('store_contacts')
    .select('*')
    .eq('store_id', id);

  res.json({
    ...store,
    contacts: contacts || []
  });
}

export async function updateStore(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  const { data: store } = await supabase
    .from('stores')
    .select('id, agency_id')
    .eq('id', id)
    .single();

  if (!store) {
    throw new AppError('Store not found', 404);
  }
  if (req.user?.role !== 'system_admin' && store.agency_id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  const { data: updated, error } = await supabase
    .from('stores')
    .update({
      chain_name: updates.chain_name,
      type: updates.type,
      address: updates.address,
      gps_latitude: updates.gps_latitude,
      gps_longitude: updates.gps_longitude,
      radius_meters: updates.radius_meters,
      shelf_layout_pdf_url: updates.shelf_layout_pdf_url,
      product_category: updates.product_category
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update store: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function getAuthorizedStores(req: AuthRequest, res: Response) {
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

  // Get authorized stores
  const { data: stores, error } = await supabase
    .from('promoter_stores')
    .select('store_id, stores(*)')
    .eq('promoter_id', promoter.id);

  if (error) {
    throw new AppError(`Failed to fetch stores: ${error.message}`, 500);
  }

  res.json(stores?.map((s: any) => s.stores) || []);
}
