-- Add profile_pic_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

-- Create storage policies for profile pictures in media bucket
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'profiles');

CREATE POLICY "Artists can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Artists can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Artists can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[2]
);