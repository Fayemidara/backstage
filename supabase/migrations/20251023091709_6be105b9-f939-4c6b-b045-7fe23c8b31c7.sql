-- Create dedicated 'media' bucket for user post content (images/audio)
-- Separates user-generated content from community wallpapers for better security
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own media (scoped to user folder)
CREATE POLICY "Users can upload their own media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Anyone can view media (posts are public)
CREATE POLICY "Anyone can view media" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

-- RLS: Users can delete their own media
CREATE POLICY "Users can delete their own media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add explicit deny policies for user_roles table
-- Makes security intentions crystal clear and prevents future misconfigurations

-- Explicitly deny role updates (roles are immutable after signup)
CREATE POLICY "Roles cannot be updated" ON public.user_roles
FOR UPDATE USING (false);

-- Explicitly deny role deletion (maintain audit trail)
CREATE POLICY "Roles cannot be deleted" ON public.user_roles
FOR DELETE USING (false);