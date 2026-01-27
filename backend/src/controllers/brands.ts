import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export async function listBrands(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;

  const { data: brands, error } = await supabase
    .from('brands')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name');

  if (error) {
    throw new AppError(`Failed to fetch brands: ${error.message}`, 500);
  }

  res.json(brands || []);
}

export async function createBrand(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const { name, visit_frequency, price_per_visit, contacts, store_ids } = req.body;

  if (!name) {
    throw new AppError('Brand name is required', 400);
  }

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      agency_id: agencyId,
      name,
      visit_frequency: visit_frequency || 1,
      price_per_visit: price_per_visit || 0
    })
    .select()
    .single();

  if (error || !brand) {
    throw new AppError('Failed to create brand', 500);
  }

  // Add contacts if provided
  if (contacts && Array.isArray(contacts)) {
    const contactRecords = contacts.map((contact: any) => ({
      brand_id: brand.id,
      name: contact.name,
      phone: contact.phone,
      role: contact.role
    }));
    await supabase.from('brand_contacts').insert(contactRecords);
  }

  // Assign stores if provided
  if (store_ids && Array.isArray(store_ids)) {
    const storeAssignments = store_ids.map((store_id: string) => ({
      brand_id: brand.id,
      store_id
    }));
    await supabase.from('brand_stores').insert(storeAssignments);
  }

  res.status(201).json(brand);
}

export async function getBrand(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;

  const { data: brand, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (error || !brand) {
    throw new AppError('Brand not found', 404);
  }

  // Get related data
  const [contacts, products, stores] = await Promise.all([
    supabase.from('brand_contacts').select('*').eq('brand_id', id),
    supabase.from('products').select('*').eq('brand_id', id),
    supabase
      .from('brand_stores')
      .select('store_id, stores(*)')
      .eq('brand_id', id)
  ]);

  res.json({
    ...brand,
    contacts: contacts.data || [],
    products: products.data || [],
    stores: stores.data || []
  });
}

export async function updateBrand(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;
  const updates = req.body;

  // Verify brand belongs to agency
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  const { data: updated, error } = await supabase
    .from('brands')
    .update({
      name: updates.name,
      visit_frequency: updates.visit_frequency,
      price_per_visit: updates.price_per_visit
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update brand: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function addProduct(req: AuthRequest, res: Response) {
  const { id: brand_id } = req.params;
  const agencyId = req.agencyId!;
  const { name, code, description, photo_url } = req.body;

  if (!name || !code) {
    throw new AppError('Product name and code are required', 400);
  }

  // Verify brand belongs to agency
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brand_id)
    .eq('agency_id', agencyId)
    .single();

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      brand_id,
      name,
      code,
      description,
      photo_url
    })
    .select()
    .single();

  if (error || !product) {
    throw new AppError('Failed to create product', 500);
  }

  res.status(201).json(product);
}

export async function updateProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;
  const updates = req.body;

  // Verify product's brand belongs to agency
  const { data: product } = await supabase
    .from('products')
    .select('brand_id, brands!inner(agency_id)')
    .eq('id', id)
    .single();

  if (!product || (product.brands as any).agency_id !== agencyId) {
    throw new AppError('Product not found', 404);
  }

  const { data: updated, error } = await supabase
    .from('products')
    .update({
      name: updates.name,
      code: updates.code,
      description: updates.description,
      photo_url: updates.photo_url
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update product: ${error.message}`, 500);
  }

  res.json(updated);
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId!;

  // Verify product's brand belongs to agency
  const { data: product } = await supabase
    .from('products')
    .select('brand_id, photo_url, brands!inner(agency_id)')
    .eq('id', id)
    .single();

  if (!product || (product.brands as any).agency_id !== agencyId) {
    throw new AppError('Product not found', 404);
  }

  // Delete product
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError(`Failed to delete product: ${error.message}`, 500);
  }

  // TODO: Optionally delete photo file from filesystem if needed
  // For MVP, we'll just delete the database record

  res.json({ message: 'Product deleted successfully' });
}

export async function getAuthorizedBrandsForStore(req: AuthRequest, res: Response) {
  const { storeId } = req.params;
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

  // Verify promoter is authorized for this store
  const { data: storeAuth } = await supabase
    .from('promoter_stores')
    .select('store_id')
    .eq('promoter_id', promoter.id)
    .eq('store_id', storeId)
    .single();

  if (!storeAuth) {
    throw new AppError('Store not authorized', 403);
  }

  // Get brands that are associated with this store
  const { data: storeBrands, error: storeBrandsError } = await supabase
    .from('brand_stores')
    .select('brand_id')
    .eq('store_id', storeId);

  if (storeBrandsError) {
    throw new AppError(`Failed to fetch store brands: ${storeBrandsError.message}`, 500);
  }

  if (!storeBrands || storeBrands.length === 0) {
    res.json([]);
    return;
  }

  const storeBrandIds = storeBrands.map((sb: any) => sb.brand_id);

  // Get brands that promoter is authorized for AND are in this store
  const { data: promoterBrands, error: promoterBrandsError } = await supabase
    .from('promoter_brands')
    .select('brand_id, brands(*)')
    .eq('promoter_id', promoter.id)
    .in('brand_id', storeBrandIds);

  if (promoterBrandsError) {
    throw new AppError(`Failed to fetch authorized brands: ${promoterBrandsError.message}`, 500);
  }

  const authorizedBrands = (promoterBrands || [])
    .map((pb: any) => pb.brands)
    .filter((brand: any) => brand !== null);

  res.json(authorizedBrands);
}
