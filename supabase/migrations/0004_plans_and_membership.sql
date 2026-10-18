-- Create Membership Plans Table
CREATE TABLE public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    duration_days INT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    features JSONB DEFAULT '[]'::jsonb NOT NULL,
    color_tag TEXT DEFAULT '#6C47FF' NOT NULL,
    is_popular BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
