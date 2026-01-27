import { supabase } from '../lib/supabase.js';
import { Request, Response } from 'express';

export async function testDatabase(req: Request, res: Response) {
  try {
    // Test if agencies table exists
    const { data, error } = await supabase
      .from('agencies')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: error.message,
        hint: 'Make sure you have run the database migrations in Supabase'
      });
    }

    res.json({
      status: 'success',
      message: 'Database connection working',
      tableExists: true,
      sampleCount: data?.length || 0
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Database test failed',
      details: error.message
    });
  }
}
