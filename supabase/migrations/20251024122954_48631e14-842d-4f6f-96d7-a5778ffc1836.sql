-- Create music_drops table
CREATE TABLE public.music_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_drops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view music drops"
ON public.music_drops
FOR SELECT
USING (true);

CREATE POLICY "Artists can create music drops for their community"
ON public.music_drops
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id = music_drops.community_id
  )
);

CREATE POLICY "Artists can update their own music drops"
ON public.music_drops
FOR UPDATE
USING (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() = artist_id
);

CREATE POLICY "Artists can delete their own music drops"
ON public.music_drops
FOR DELETE
USING (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() = artist_id
);

-- Trigger for updated_at
CREATE TRIGGER update_music_drops_updated_at
BEFORE UPDATE ON public.music_drops
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Storage policies for media bucket music uploads
CREATE POLICY "Artists can upload music to their community folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media'
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Artists can delete their community music"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media'
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Anyone can view media files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media');