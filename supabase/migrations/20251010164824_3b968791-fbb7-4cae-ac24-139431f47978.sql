-- Add theme support to communities table
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS theme_json jsonb DEFAULT '{"primaryColor": "#8B5CF6", "secondaryColor": "#EC4899", "wallpaper": "gradient"}'::jsonb;

-- Add verification status to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified'));

-- Update existing verified users to have 'verified' status
UPDATE public.profiles
SET verification_status = 'verified'
WHERE verified = true;