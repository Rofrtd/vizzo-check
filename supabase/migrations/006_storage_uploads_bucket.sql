-- Create public bucket for uploads (profile pictures, visit/product/brand/store images).
-- Uploads are performed server-side with the service role; public read for serving URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read (SELECT) on objects in the uploads bucket.
-- INSERT/UPDATE/DELETE are done server-side with service role (bypasses RLS).
CREATE POLICY "Public read for uploads bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');
