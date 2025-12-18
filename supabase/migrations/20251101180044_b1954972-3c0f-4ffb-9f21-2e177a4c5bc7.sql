-- Add welcome_audio_url column to communities table
ALTER TABLE public.communities
ADD COLUMN welcome_audio_url text;