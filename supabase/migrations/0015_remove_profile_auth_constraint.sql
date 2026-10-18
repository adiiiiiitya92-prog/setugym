-- 1. Drop the foreign key constraint that requires all profiles to exist in auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Create trigger function to handle cascade delete on auth user removal manually
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = old.id;
    RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the AFTER DELETE trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();
