import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { User } from '@vizzocheck/shared';

export interface AuthRequest extends Request {
  user?: User;
  agencyId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; agencyId: string | null; role: string };
    
    // Fetch user from database to ensure they still exist
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user as User;
    req.agencyId = decoded.agencyId ?? undefined;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Resolve the agency scope for the request.
 * - system_admin: uses queryAgencyId (from query param) when provided; otherwise undefined (caller may list all or require agency_id).
 * - agency: always uses req.agencyId (ignores query param for security).
 */
export function getEffectiveAgencyId(req: AuthRequest, queryAgencyId?: string | null): string | undefined {
  if (!req.user) return undefined;
  if (req.user.role === 'system_admin') {
    return queryAgencyId ?? undefined;
  }
  return req.agencyId;
}
