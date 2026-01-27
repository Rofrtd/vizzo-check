import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getAgency(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const agencyId = req.agencyId;

  // Ensure user can only access their own agency
  if (id !== agencyId) {
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
