-- V3: Permissive Debug Policy (Nuclear Option)
-- This removes path restrictions to test if the bucket itself is accessible

DROP POLICY IF EXISTS "Artists can upload verification screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Artists can view own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view verification screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Debug: Allow all uploads to verifications" ON storage.objects;
DROP POLICY IF EXISTS "Debug: Allow all view on verifications" ON storage.objects;

-- Allow ANY authenticated user to upload to 'verifications' bucket (ignoring path)
CREATE POLICY "Debug: Allow all uploads to verifications"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.role() = 'authenticated'
);

-- Allow viewing
CREATE POLICY "Debug: Allow all view on verifications"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verifications'
  AND auth.role() = 'authenticated'
);
