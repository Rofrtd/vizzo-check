import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export async function listAgencies(req: AuthRequest, res: Response) {
  // Only system_admin can list all agencies (route is protected by requireRole(['system_admin']))
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('*')
    .order('name');

  if (error) {
    throw new AppError(`Failed to fetch agencies: ${error.message}`, 500);
  }

  res.json(agencies || []);
}

export async function getAgency(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // system_admin can access any agency; agency can only access their own
  if (req.user?.role !== 'system_admin' && id !== req.agencyId) {
    throw new AppError('Forbidden', 403);
  }

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !agency) {
    throw new AppError('Agency not found', 404);
  }

  res.json(agency);
}
