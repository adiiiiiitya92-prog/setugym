-- Create Profiles Table (without the foreign key constraint to gyms for now to avoid circular dependency)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    gym_id UUID, -- Foreign key will be added in migration 0003
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger Function to handle new auth users registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, gym_id, full_name, phone, avatar_url, is_active)
    VALUES (
        new.id,
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'member'::user_role),
        (new.raw_user_meta_data->>'gym_id')::uuid,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Member'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'avatar_url',
        true
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user function on insert into auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
