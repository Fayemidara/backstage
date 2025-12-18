-- Create wallpapers storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallpapers', 'wallpapers', true)
ON CONFLICT (id) DO NOTHING;

-- Add wallpaper_url column to communities table
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS wallpaper_url text;

-- Create RLS policies for wallpapers bucket
CREATE POLICY "Anyone can view wallpapers"
ON storage.objects FOR SELECT
USING (bucket_id = 'wallpapers');

CREATE POLICY "Artists can upload wallpapers for their community"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wallpapers' 
  AND auth.uid() IN (
    SELECT artist_id FROM public.communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Artists can update their community wallpapers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'wallpapers'
  AND auth.uid() IN (
    SELECT artist_id FROM public.communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Artists can delete their community wallpapers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'wallpapers'
  AND auth.uid() IN (
    SELECT artist_id FROM public.communities 
    WHERE id::text = (storage.foldername(name))[1]
  )
);