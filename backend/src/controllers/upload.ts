import { Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { saveVisitPhoto, saveProductPhoto, saveBrandLogo, saveStoreLogo, savePromoterPhoto } from '../utils/fileUpload.js';
import { supabase } from '../lib/supabase.js';

export async function uploadPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { visit_id, product_id, type } = req.body;
  const agencyId = req.agencyId!;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!visit_id || !product_id || !type) {
    throw new AppError('Missing required fields: visit_id, product_id, type', 400);
  }

  if (type !== 'before' && type !== 'after') {
    throw new AppError('Type must be "before" or "after"', 400);
  }

  try {
    const url = saveVisitPhoto(file, agencyId, visit_id, product_id, type);
    res.json({ url });
  } catch (error: any) {
    throw new AppError(`Failed to save photo: ${error.message}`, 500);
  }
}

export async function uploadProductPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { product_id } = req.body;
  const agencyId = req.agencyId!;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!product_id) {
    throw new AppError('Missing required field: product_id', 400);
  }

  // Verify product belongs to agency
  const { data: product } = await supabase
    .from('products')
    .select('id, brands!inner(agency_id)')
    .eq('id', product_id)
    .single();

  if (!product || (product.brands as any).agency_id !== agencyId) {
    throw new AppError('Product not found', 404);
  }

  try {
    const url = saveProductPhoto(file, agencyId, product_id);
    
    // Update product with photo URL
    await supabase
      .from('products')
      .update({ photo_url: url })
      .eq('id', product_id);

    res.json({ url });
  } catch (error: any) {
    throw new AppError(`Failed to save photo: ${error.message}`, 500);
  }
}

export async function uploadBrandLogo(req: AuthRequest, res: Response) {
  const file = req.file;
  const { brand_id } = req.body;
  const agencyId = req.agencyId!;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!brand_id) {
    throw new AppError('Missing required field: brand_id', 400);
  }

  // Verify brand belongs to agency
  const { data: brand } = await supabase
    .from('brands')
    .select('id, agency_id')
    .eq('id', brand_id)
    .single();

  if (!brand || brand.agency_id !== agencyId) {
    throw new AppError('Brand not found', 404);
  }

  try {
    const url = saveBrandLogo(file, agencyId, brand_id);
    
    // Update brand with logo URL
    await supabase
      .from('brands')
      .update({ logo_url: url })
      .eq('id', brand_id);

    res.json({ url });
  } catch (error: any) {
    throw new AppError(`Failed to save logo: ${error.message}`, 500);
  }
}

export async function uploadStoreLogo(req: AuthRequest, res: Response) {
  const file = req.file;
  const { store_id } = req.body;
  const agencyId = req.agencyId!;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!store_id) {
    throw new AppError('Missing required field: store_id', 400);
  }

  // Verify store belongs to agency
  const { data: store } = await supabase
    .from('stores')
    .select('id, agency_id')
    .eq('id', store_id)
    .single();

  if (!store || store.agency_id !== agencyId) {
    throw new AppError('Store not found', 404);
  }

  try {
    const url = saveStoreLogo(file, agencyId, store_id);
    
    // Update store with logo URL
    await supabase
      .from('stores')
      .update({ logo_url: url })
      .eq('id', store_id);

    res.json({ url });
  } catch (error: any) {
    throw new AppError(`Failed to save logo: ${error.message}`, 500);
  }
}

export async function uploadPromoterPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { promoter_id } = req.body;
  const agencyId = req.agencyId!;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!promoter_id) {
    throw new AppError('Missing required field: promoter_id', 400);
  }

  // Verify promoter belongs to agency
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyId);

  if (!users || users.length === 0) {
    throw new AppError('Promoter not found', 404);
  }

  const userIds = users.map(u => u.id);
  const { data: promoter } = await supabase
    .from('promoters')
    .select('id, user_id')
    .eq('id', promoter_id)
    .in('user_id', userIds)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }

  try {
    const url = savePromoterPhoto(file, agencyId, promoter_id);
    
    // Update promoter with photo URL
    await supabase
      .from('promoters')
      .update({ photo_url: url })
      .eq('id', promoter_id);

    res.json({ url });
  } catch (error: any) {
    throw new AppError(`Failed to save photo: ${error.message}`, 500);
  }
}
