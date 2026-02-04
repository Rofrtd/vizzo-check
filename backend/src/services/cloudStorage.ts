import { supabase } from '../lib/supabase.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

/**
 * Upload an image buffer to Supabase Storage and return the public URL.
 */
export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  key: string
): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: mimetype,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
