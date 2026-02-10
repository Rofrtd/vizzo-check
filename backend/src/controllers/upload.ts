import path from 'path';
import { Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { uploadImage } from '../services/cloudStorage.js';
import { processImage } from '../services/imageProcessing.js';
import { supabase } from '../lib/supabase.js';

function buildVisitPhotoKey(
  agencyId: string,
  visitId: string,
  productId: string,
  type: 'before' | 'after',
  ext: string
): string {
  return `${agencyId}/visits/${visitId}/product-${productId}-${type}-${Date.now()}${ext}`;
}

function resolveUploadAgencyId(req: AuthRequest, resourceAgencyId: string): void {
  if (req.user?.role === 'system_admin') return;
  if (resourceAgencyId !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }
}

export async function uploadPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { visit_id, product_id, type } = req.body;

  if (!file || !file.buffer) {
    throw new AppError('No file uploaded', 400);
  }

  if (!visit_id || !product_id || !type) {
    throw new AppError('Missing required fields: visit_id, product_id, type', 400);
  }

  if (type !== 'before' && type !== 'after') {
    throw new AppError('Type must be "before" or "after"', 400);
  }

  const { data: visit } = await supabase
    .from('visits')
    .select('promoter:promoters(user:users!inner(agency_id))')
    .eq('id', visit_id)
    .single();
  if (!visit) throw new AppError('Visit not found', 404);
  const agencyId = (visit.promoter as any)?.user?.agency_id;
  if (!agencyId) throw new AppError('Visit not found', 404);
  resolveUploadAgencyId(req, agencyId);

  try {
    const ext = path.extname(file.originalname);
    const key = buildVisitPhotoKey(agencyId, visit_id, product_id, type, ext);
    const { buffer, mimetype } = await processImage(file.buffer, file.mimetype);
    const url = await uploadImage(buffer, mimetype, key);
    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to save photo: ${message}`, 500);
  }
}

export async function uploadProductPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { product_id } = req.body;

  if (!file || !file.buffer) {
    throw new AppError('No file uploaded', 400);
  }

  if (!product_id) {
    throw new AppError('Missing required field: product_id', 400);
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, brands!inner(agency_id)')
    .eq('id', product_id)
    .single();

  if (!product) {
    throw new AppError('Product not found', 404);
  }
  const agencyId = (product.brands as any).agency_id;
  resolveUploadAgencyId(req, agencyId);

  try {
    const ext = path.extname(file.originalname);
    const key = `${agencyId}/products/${product_id}/product-${Date.now()}${ext}`;
    const { buffer, mimetype } = await processImage(file.buffer, file.mimetype);
    const url = await uploadImage(buffer, mimetype, key);

    await supabase
      .from('products')
      .update({ photo_url: url })
      .eq('id', product_id);

    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to save photo: ${message}`, 500);
  }
}

export async function uploadBrandLogo(req: AuthRequest, res: Response) {
  const file = req.file;
  const { brand_id } = req.body;

  if (!file || !file.buffer) {
    throw new AppError('No file uploaded', 400);
  }

  if (!brand_id) {
    throw new AppError('Missing required field: brand_id', 400);
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, agency_id')
    .eq('id', brand_id)
    .single();

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }
  resolveUploadAgencyId(req, brand.agency_id);
  const agencyId = brand.agency_id;

  try {
    const ext = path.extname(file.originalname);
    const key = `${agencyId}/brands/${brand_id}/logo-${Date.now()}${ext}`;
    const { buffer, mimetype } = await processImage(file.buffer, file.mimetype);
    const url = await uploadImage(buffer, mimetype, key);

    await supabase
      .from('brands')
      .update({ logo_url: url })
      .eq('id', brand_id);

    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to save logo: ${message}`, 500);
  }
}

export async function uploadStoreLogo(req: AuthRequest, res: Response) {
  const file = req.file;
  const { store_id } = req.body;

  if (!file || !file.buffer) {
    throw new AppError('No file uploaded', 400);
  }

  if (!store_id) {
    throw new AppError('Missing required field: store_id', 400);
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id, agency_id')
    .eq('id', store_id)
    .single();

  if (!store) {
    throw new AppError('Store not found', 404);
  }
  resolveUploadAgencyId(req, store.agency_id);
  const agencyId = store.agency_id;

  try {
    const ext = path.extname(file.originalname);
    const key = `${agencyId}/stores/${store_id}/logo-${Date.now()}${ext}`;
    const { buffer, mimetype } = await processImage(file.buffer, file.mimetype);
    const url = await uploadImage(buffer, mimetype, key);

    await supabase
      .from('stores')
      .update({ logo_url: url })
      .eq('id', store_id);

    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to save logo: ${message}`, 500);
  }
}

export async function uploadPromoterPhoto(req: AuthRequest, res: Response) {
  const file = req.file;
  const { promoter_id } = req.body;

  if (!file || !file.buffer) {
    throw new AppError('No file uploaded', 400);
  }

  if (!promoter_id) {
    throw new AppError('Missing required field: promoter_id', 400);
  }

  const { data: promoter } = await supabase
    .from('promoters')
    .select('id, user:users!inner(agency_id)')
    .eq('id', promoter_id)
    .single();

  if (!promoter) {
    throw new AppError('Promoter not found', 404);
  }
  const agencyId = (promoter.user as any).agency_id;
  resolveUploadAgencyId(req, agencyId);

  try {
    const ext = path.extname(file.originalname);
    const key = `${agencyId}/promoters/${promoter_id}/photo-${Date.now()}${ext}`;
    const { buffer, mimetype } = await processImage(file.buffer, file.mimetype);
    const url = await uploadImage(buffer, mimetype, key);

    await supabase
      .from('promoters')
      .update({ photo_url: url })
      .eq('id', promoter_id);

    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(`Failed to save photo: ${message}`, 500);
  }
}
