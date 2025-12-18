-- Fix wallpaper storage policies - explicit table references

-- Drop old policies
DROP POLICY IF EXISTS "Artists can upload wallpapers for their community" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their community wallpapers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their community wallpapers" ON storage.objects;

-- Create corrected policies with explicit storage.objects.name reference
CREATE POLICY "Artists can upload wallpapers for their community"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Artists can update their community wallpapers"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Artists can delete their community wallpapers"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);