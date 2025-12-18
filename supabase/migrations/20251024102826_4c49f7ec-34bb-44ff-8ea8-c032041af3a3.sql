-- Fix wallpaper storage policies to use community.id instead of community.name

-- Drop old policies
DROP POLICY IF EXISTS "Artists can upload wallpapers for their community" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their community wallpapers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their community wallpapers" ON storage.objects;

-- Create corrected policies that match the upload path (community.id)
CREATE POLICY "Artists can upload wallpapers for their community"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT artist_id FROM communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Artists can update their community wallpapers"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT artist_id FROM communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Artists can delete their community wallpapers"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT artist_id FROM communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);