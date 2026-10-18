-- 1. Add created_by audit column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Update the handle_new_user trigger function to read and insert created_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, gym_id, full_name, phone, avatar_url, is_active, created_by)
    VALUES (
        new.id,
        COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'member'::public.user_role),
        (new.raw_user_meta_data->>'gym_id')::uuid,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Member'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'avatar_url',
        true,
        (new.raw_user_meta_data->>'created_by')::uuid
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 3. Create helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_gym_owner_of(check_gym_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role = 'gym_owner' AND gym_id = check_gym_id FROM public.profiles WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Create SECURITY DEFINER function to allow role updates by super admins only
CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id UUID, new_role user_role)
RETURNS VOID AS $$
BEGIN
    -- Check if calling user is super_admin
    IF COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'member') != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can change user roles.';
    END IF;

    -- Set local session variable to allow role change
    PERFORM set_config('app.allow_role_change', 'true', true);

    -- Update the role
    UPDATE public.profiles
    SET role = new_role
    WHERE id = target_user_id;

    -- Reset local session variable
    PERFORM set_config('app.allow_role_change', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Replace protect_role_escalation to enforce the use of change_user_role function
CREATE OR REPLACE FUNCTION public.protect_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Check if role change is allowed via session variable
        IF COALESCE(current_setting('app.allow_role_change', true), 'false') != 'true' THEN
            RAISE EXCEPTION 'Unauthorized: Direct role updates are not allowed. Use change_user_role function.';
        END IF;
        -- Double check that the caller is indeed super_admin
        IF COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'member') != 'super_admin' THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Admins can change roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger function to restrict basic column updates for non-super admins
CREATE OR REPLACE FUNCTION public.restrict_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Enforce only for authenticated client users (auth.uid() is not null)
    IF auth.uid() IS NOT NULL THEN
        -- If not super admin
        IF COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'member') != 'super_admin' THEN
            IF NEW.id IS DISTINCT FROM OLD.id OR
               NEW.role IS DISTINCT FROM OLD.role OR
               NEW.gym_id IS DISTINCT FROM OLD.gym_id OR
               NEW.is_active IS DISTINCT FROM OLD.is_active OR
               NEW.is_deleted IS DISTINCT FROM OLD.is_deleted OR
               NEW.created_by IS DISTINCT FROM OLD.created_by OR
               NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION 'Unauthorized: You can only update full_name, phone, and avatar_url.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind restrict_profile_update trigger to profiles table
DROP TRIGGER IF EXISTS trigger_restrict_profile_update ON public.profiles;
CREATE TRIGGER trigger_restrict_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.restrict_profile_update();
