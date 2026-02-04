-- Allow INSERT and UPDATE on storage.objects for the uploads bucket so server-side
-- uploads (and upsert) succeed. Without these, "new row violates row-level security policy" occurs.
-- The backend uses the service role key; some setups still require explicit policies.

CREATE POLICY "Allow insert into uploads bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow update in uploads bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');
