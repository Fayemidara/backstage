-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  message TEXT,
  image_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view announcements" 
ON public.announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Artists can create announcements for their community" 
ON public.announcements 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() IN (
    SELECT c.artist_id 
    FROM communities c 
    WHERE c.id = announcements.community_id
  )
);

CREATE POLICY "Artists can update their own announcements" 
ON public.announcements 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() = artist_id
);

CREATE POLICY "Artists can delete their own announcements" 
ON public.announcements 
FOR DELETE 
USING (
  has_role(auth.uid(), 'artist'::app_role) 
  AND auth.uid() = artist_id
);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;