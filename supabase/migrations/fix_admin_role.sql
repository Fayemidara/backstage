-- Check if the user has the admin role
-- Replace 'YOUR_EMAIL' with the actual email of the admin user
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- Verify the role
SELECT * FROM public.user_roles 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);
