-- Create Gyms Table
CREATE TABLE public.gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gst_number TEXT,
    website TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Alter profiles to add foreign key to gyms
ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_gym_id FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;

-- Create Subscription Plans Table
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    max_members INT NOT NULL,
    max_trainers INT NOT NULL,
    max_gyms INT DEFAULT 1 NOT NULL,
    features JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_highlighted BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Gym Subscriptions Table
CREATE TABLE public.gym_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    status subscription_status DEFAULT 'trial' NOT NULL,
    trial_started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    amount_paid NUMERIC(10,2),
    payment_reference TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Helper Function to check if a Gym is Active
CREATE OR REPLACE FUNCTION public.is_gym_active(gym_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status subscription_status;
    t_ends TIMESTAMPTZ;
BEGIN
    -- Query the gym subscription status
    SELECT status, trial_ends_at INTO sub_status, t_ends
    FROM public.gym_subscriptions
    WHERE gym_id = gym_id_param
    ORDER BY created_at DESC
    LIMIT 1;

    -- Return true if active or within trial period
    IF sub_status = 'active' THEN
        RETURN TRUE;
    ELSIF sub_status = 'trial' AND t_ends > now() THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
