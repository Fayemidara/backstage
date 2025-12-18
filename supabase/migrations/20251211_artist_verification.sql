-- Drop tables if they exist to ensure clean state (fixes potential constraint mismatches)
DROP TABLE IF EXISTS public.verifications CASCADE;
DROP TABLE IF EXISTS public.artist_usernames CASCADE;

-- Create artist_usernames table
CREATE TABLE public.artist_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create verifications table
CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  screenshot_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies for artist_usernames
ALTER TABLE public.artist_usernames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view verified artist usernames" ON public.artist_usernames;
CREATE POLICY "Anyone can view verified artist usernames" ON public.artist_usernames
  FOR SELECT USING (verified = true);

DROP POLICY IF EXISTS "Artists can view their own username" ON public.artist_usernames;
CREATE POLICY "Artists can view their own username" ON public.artist_usernames
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Artists can insert their own username" ON public.artist_usernames;
CREATE POLICY "Artists can insert their own username" ON public.artist_usernames
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Admins can update artist usernames" ON public.artist_usernames;
CREATE POLICY "Admins can update artist usernames" ON public.artist_usernames
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for verifications
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artists can view their own verifications" ON public.verifications;
CREATE POLICY "Artists can view their own verifications" ON public.verifications
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Artists can create their own verifications" ON public.verifications;
CREATE POLICY "Artists can create their own verifications" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Admins can view all verifications" ON public.verifications;
CREATE POLICY "Admins can view all verifications" ON public.verifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update verifications" ON public.verifications;
CREATE POLICY "Admins can update verifications" ON public.verifications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for verification screenshots (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: artists can upload verification screenshots
DROP POLICY IF EXISTS "Artists can upload verification screenshots" ON storage.objects;
CREATE POLICY "Artists can upload verification screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verifications' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: admins can view all verification screenshots
DROP POLICY IF EXISTS "Admins can view verification screenshots" ON storage.objects;
CREATE POLICY "Admins can view verification screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'verifications' AND public.has_role(auth.uid(), 'admin'));

-- Storage policy: artists can view their own screenshots
DROP POLICY IF EXISTS "Artists can view own screenshots" ON storage.objects;
CREATE POLICY "Artists can view own screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'verifications' AND auth.uid()::text = (storage.foldername(name))[1]);

-- BACKFILL EXISTING ARTISTS
-- Insert existing artists from profiles into artist_usernames as verified
-- Joining with user_roles since profiles.role column might not exist or is deprecated
INSERT INTO public.artist_usernames (artist_id, username, verified)
SELECT p.id, p.username, true
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'artist'
ON CONFLICT (username) DO NOTHING;
