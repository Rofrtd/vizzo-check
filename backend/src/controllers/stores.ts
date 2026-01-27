import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export async function listStores(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;

  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .eq('agency_id', agencyId)
    .order('chain_name');

  if (error) {
    throw new AppError(`Failed to fetch stores: ${error.message}`, 500);
  }

  res.json(stores || []);
}

export async function createStore(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const { chain_name, type, address, gps_latitude, gps_longitude, radius_meters, shelf_layout_pdf_url, product_category, contacts } = req.body;

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
      radius_meters: radius_meters || 50,
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
  const agencyId = req.agencyId!;

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (error || !store) {
    throw new AppError('Store not found', 404);
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
  const agencyId = req.agencyId!;
  const updates = req.body;

  // Verify store belongs to agency
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (!store) {
    throw new AppError('Store not found', 404);
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
