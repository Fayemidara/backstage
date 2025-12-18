-- Add display_name column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text;

-- Set default display_name to username for existing users
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload their own profile pic" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pic" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pic" ON storage.objects;

-- RLS policies for profile pictures
CREATE POLICY "Authenticated users can upload their own profile pic"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their own profile pic"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pic"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);