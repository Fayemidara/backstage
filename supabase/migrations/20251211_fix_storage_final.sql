-- Final Storage Fix
-- 1. Ensure the bucket actually exists (in case the first migration failed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop ALL potential conflicting policies
DROP POLICY IF EXISTS "Artists can upload verification screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Artists can view own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view verification screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Debug: Allow all uploads to verifications" ON storage.objects;
DROP POLICY IF EXISTS "Debug: Allow all view on verifications" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to verifications" ON storage.objects;
DROP POLICY IF EXISTS "Allow all view on verifications" ON storage.objects;

-- 3. Create the simplest possible permissive policies
CREATE POLICY "Allow all uploads to verifications"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow all view on verifications"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verifications'
  AND auth.role() = 'authenticated'
);
