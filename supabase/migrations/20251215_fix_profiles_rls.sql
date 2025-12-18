-- Enable RLS on profiles if not already enabled
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to view profiles (needed for Search/Discovery)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "public"."profiles";
CREATE POLICY "Public profiles are viewable by everyone"
ON "public"."profiles"
FOR SELECT
USING (true);

-- 2. Allow users to update their own profile (needed for first_login flag)
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
CREATE POLICY "Users can update own profile"
ON "public"."profiles"
FOR UPDATE
USING (auth.uid() = id);

-- 3. Allow users to insert their own profile (safety net)
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."profiles";
CREATE POLICY "Users can insert own profile"
ON "public"."profiles"
FOR INSERT
WITH CHECK (auth.uid() = id);
