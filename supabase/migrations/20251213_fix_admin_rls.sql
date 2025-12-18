-- Enable RLS to be safe
ALTER TABLE "public"."verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."artist_usernames" ENABLE ROW LEVEL SECURITY;

-- 1. Admin access to verifications
-- Drop if exists to avoid errors
DROP POLICY IF EXISTS "Admins can view all verifications" ON "public"."verifications";

CREATE POLICY "Admins can view all verifications"
ON "public"."verifications"
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 2. Admin access to artist_usernames
-- Drop if exists to avoid errors
DROP POLICY IF EXISTS "Admins can view all artist usernames" ON "public"."artist_usernames";

CREATE POLICY "Admins can view all artist usernames"
ON "public"."artist_usernames"
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
