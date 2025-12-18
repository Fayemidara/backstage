-- Add Echo Moments fields to communities table
ALTER TABLE public.communities
ADD COLUMN echo_track_url TEXT,
ADD COLUMN echo_clip_start NUMERIC,
ADD COLUMN echo_clip_end NUMERIC;