-- Remove the vulnerable 'role' column from profiles table
-- This column allowed users to escalate their own privileges by updating profiles.role
-- The secure role system uses the 'user_roles' table with proper RLS policies

ALTER TABLE profiles DROP COLUMN IF EXISTS role;