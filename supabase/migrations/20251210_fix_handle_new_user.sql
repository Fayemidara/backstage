-- Force update the handle_new_user function to ensure it captures username correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_username text;
  meta_role public.app_role;
BEGIN
  -- Extract values with explicit logging (visible in Postgres logs)
  meta_username := NEW.raw_user_meta_data->>'username';
  meta_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'fan');

  -- Log what we received (for debugging)
  RAISE LOG 'handle_new_user triggered. ID: %, Username: %, Role: %, Raw Meta: %', 
    NEW.id, meta_username, meta_role, NEW.raw_user_meta_data;

  -- Insert into profiles
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(meta_username, 'user_' || substring(NEW.id::text from 1 for 8)),
    meta_role
  );
  
  -- Insert role into user_roles (if not exists, though trigger usually runs once)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    meta_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
