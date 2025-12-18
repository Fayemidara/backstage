-- Storage policies to allow uploads to 'media' bucket and public reads
-- Note: Policies are additive. These policies scope access to the 'media' bucket only.

-- Public read access for media bucket (so files are viewable)
CREATE POLICY "Public read for media objects"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

-- Authenticated users can upload to media bucket
CREATE POLICY "Authenticated can upload to media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');