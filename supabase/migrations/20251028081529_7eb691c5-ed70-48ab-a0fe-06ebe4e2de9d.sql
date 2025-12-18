-- Create ticket_drops table
CREATE TABLE IF NOT EXISTS public.ticket_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  message TEXT,
  image_url TEXT,
  ticket_link TEXT,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ticket_drops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view ticket drops"
  ON public.ticket_drops
  FOR SELECT
  USING (true);

CREATE POLICY "Artists can create ticket drops for their community"
  ON public.ticket_drops
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'artist'::app_role) AND
    auth.uid() IN (SELECT c.artist_id FROM communities c WHERE c.id = ticket_drops.community_id)
  );

CREATE POLICY "Artists can update their own ticket drops"
  ON public.ticket_drops
  FOR UPDATE
  USING (has_role(auth.uid(), 'artist'::app_role) AND auth.uid() = artist_id);

CREATE POLICY "Artists can delete their own ticket drops"
  ON public.ticket_drops
  FOR DELETE
  USING (has_role(auth.uid(), 'artist'::app_role) AND auth.uid() = artist_id);

-- Trigger for updated_at
CREATE TRIGGER update_ticket_drops_updated_at
  BEFORE UPDATE ON public.ticket_drops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_drops;