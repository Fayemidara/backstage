-- Create posts table for the Lounge room
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reactions JSONB DEFAULT '{}'::jsonb,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT text_length CHECK (char_length(text) <= 280)
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX idx_posts_community_id ON public.posts(community_id);
CREATE INDEX idx_posts_parent_post_id ON public.posts(parent_post_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- RLS Policies for posts

-- Anyone can view posts in communities (we'll handle subscription checks in the app)
CREATE POLICY "Anyone can view posts"
ON public.posts
FOR SELECT
USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);

-- Artists can delete any posts in their community
CREATE POLICY "Artists can delete posts in their community"
ON public.posts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = posts.community_id
    AND c.artist_id = auth.uid()
  )
);

-- Artists can update any posts in their community (for pinning)
CREATE POLICY "Artists can update posts in their community"
ON public.posts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = posts.community_id
    AND c.artist_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;