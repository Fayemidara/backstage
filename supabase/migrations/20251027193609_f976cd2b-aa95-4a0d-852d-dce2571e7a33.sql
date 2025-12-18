-- Create merch_drops table
CREATE TABLE public.merch_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  message TEXT,
  image_url TEXT NOT NULL,
  buy_link TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merch_drops ENABLE ROW LEVEL SECURITY;

-- Create policies for merch_drops
CREATE POLICY "Anyone can view merch drops"
ON public.merch_drops
FOR SELECT
USING (true);

CREATE POLICY "Artists can create merch drops for their community"
ON public.merch_drops
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'artist'::app_role) AND
  auth.uid() IN (
    SELECT c.artist_id
    FROM communities c
    WHERE c.id = merch_drops.community_id
  )
);

CREATE POLICY "Artists can update their own merch drops"
ON public.merch_drops
FOR UPDATE
USING (
  has_role(auth.uid(), 'artist'::app_role) AND
  auth.uid() = artist_id
);

CREATE POLICY "Artists can delete their own merch drops"
ON public.merch_drops
FOR DELETE
USING (
  has_role(auth.uid(), 'artist'::app_role) AND
  auth.uid() = artist_id
);

-- Add trigger for updated_at
CREATE TRIGGER handle_merch_drops_updated_at
BEFORE UPDATE ON public.merch_drops
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.merch_drops;