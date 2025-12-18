-- Fix Storage RLS Policy to be more robust
DROP POLICY IF EXISTS "Artists can upload verification screenshots" ON storage.objects;

CREATE POLICY "Artists can upload verification screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verifications' 
  AND auth.uid() IS NOT NULL
  AND (name LIKE auth.uid() || '/%')
);

-- Ensure authenticated users can read their own uploads (for display in dashboard/admin)
DROP POLICY IF EXISTS "Artists can view own screenshots" ON storage.objects;
CREATE POLICY "Artists can view own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verifications' 
  AND auth.uid() IS NOT NULL
  AND (name LIKE auth.uid() || '/%')
);
