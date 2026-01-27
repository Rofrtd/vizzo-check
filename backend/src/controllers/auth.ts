import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { RegisterRequest, LoginRequest, LoginResponse } from '@vizzocheck/shared';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function register(req: Request<{}, {}, RegisterRequest>, res: Response) {
  const { email, password, agency_name, admin_name } = req.body;

  if (!email || !password || !agency_name || !admin_name) {
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

  // Create agency
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .insert({ name: agency_name })
    .select()
    .single();

  if (agencyError || !agency) {
    console.error('Agency creation error:', agencyError);
    throw new AppError(
      `Failed to create agency: ${agencyError?.message || 'Unknown error'}. Make sure database migrations have been run.`,
      500
    );
  }

  // Create admin user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      password_hash,
      role: 'agency_admin',
      agency_id: agency.id
    })
    .select()
    .single();

  if (userError || !user) {
    // Rollback: delete agency if user creation fails
    await supabase.from('agencies').delete().eq('id', agency.id);
    throw new AppError('Failed to create user', 500);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, agencyId: agency.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
      created_at: user.created_at
    }
  });
}

export async function login(req: Request<{}, {}, LoginRequest>, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Find user
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, agencyId: user.agency_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
      created_at: user.created_at
    }
  } as LoginResponse);
}

export async function getMe(req: Request, res: Response) {
  const authReq = req as any;
  res.json({ user: authReq.user });
}
