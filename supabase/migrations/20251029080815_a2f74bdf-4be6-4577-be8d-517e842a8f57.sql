-- Add Spotify Blend fields to communities table
ALTER TABLE public.communities 
ADD COLUMN blend_link TEXT,
ADD COLUMN blend_active BOOLEAN DEFAULT false,
ADD COLUMN blend_full_at TIMESTAMP WITH TIME ZONE;