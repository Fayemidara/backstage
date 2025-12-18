-- Fix Storage RLS Policy V2 (Explicit Casting)
-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Artists can upload verification screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Artists can view own screenshots" ON storage.objects;

-- Create a more permissive but still secure policy
-- We explicitly cast auth.uid() to text to avoid type mismatch issues
CREATE POLICY "Artists can upload verification screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verifications' 
  AND auth.role() = 'authenticated'
  AND (name LIKE (auth.uid()::text || '/%'))
);

-- Ensure authenticated users can read their own uploads
CREATE POLICY "Artists can view own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verifications' 
  AND auth.role() = 'authenticated'
  AND (name LIKE (auth.uid()::text || '/%'))
);

-- Allow Admins to view everything in this bucket
DROP POLICY IF EXISTS "Admins can view verification screenshots" ON storage.objects;
CREATE POLICY "Admins can view verification screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verifications' 
  AND public.has_role(auth.uid(), 'admin')
);
