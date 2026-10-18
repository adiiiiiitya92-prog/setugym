-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Populate email for existing users from auth.users
UPDATE public.profiles p 
SET email = u.email 
FROM auth.users u 
WHERE p.id = u.id;

-- Update the handle_new_user trigger function to insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, gym_id, full_name, phone, email, avatar_url, is_active, created_by)
    VALUES (
        new.id,
        COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'member'::public.user_role),
        (new.raw_user_meta_data->>'gym_id')::uuid,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Member'),
        new.raw_user_meta_data->>'phone',
        new.email,
        new.raw_user_meta_data->>'avatar_url',
        true,
        (new.raw_user_meta_data->>'created_by')::uuid
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
