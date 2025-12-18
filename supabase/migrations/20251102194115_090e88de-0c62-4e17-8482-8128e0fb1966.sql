-- Allow artists to view subscriptions for their communities so they can create notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Artists can view subscriptions for their communities'
  ) THEN
    CREATE POLICY "Artists can view subscriptions for their communities"
    ON public.subscriptions
    FOR SELECT
    USING (
      has_role(auth.uid(), 'artist'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = subscriptions.community_id
          AND c.artist_id = auth.uid()
      )
    );
  END IF;
END $$;