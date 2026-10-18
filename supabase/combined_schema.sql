-- ==========================================
-- MIGRATION: 0001_enums_and_extensions.sql
-- ==========================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'gym_owner',
    'trainer',
    'member'
);

CREATE TYPE subscription_status AS ENUM (
    'trial',
    'active',
    'expired',
    'cancelled',
    'suspended'
);

CREATE TYPE member_status AS ENUM (
    'active',
    'expired',
    'pending',
    'suspended',
    'inactive',
    'blocked'
);

CREATE TYPE attendance_method AS ENUM (
    'qr_scan',
    'manual',
    'self_checkin'
);

CREATE TYPE invoice_status AS ENUM (
    'paid',
    'pending',
    'overdue',
    'cancelled'
);

CREATE TYPE notice_priority AS ENUM (
    'normal',
    'urgent'
);

CREATE TYPE goal_type AS ENUM (
    'weight_loss',
    'weight_gain',
    'maintenance',
    'muscle_gain'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other'
);


-- ==========================================
-- MIGRATION: 0002_profiles_and_auth.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0003_gyms_and_subscriptions.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0004_plans_and_membership.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0005_members.sql
-- ==========================================

-- Create Members Table
CREATE TABLE public.members (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_code TEXT UNIQUE,
    membership_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    assigned_trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date_of_birth DATE,
    gender gender_type,
    address TEXT,
    emergency_contact TEXT,
    join_date DATE DEFAULT current_date NOT NULL,
    expiry_date DATE,
    status member_status DEFAULT 'active' NOT NULL,
    qr_payload TEXT UNIQUE,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_members_gym_status ON public.members (gym_id, status);
CREATE INDEX idx_members_qr_payload ON public.members (qr_payload);

-- Function to generate sequential member code based on gym name initials
CREATE OR REPLACE FUNCTION public.generate_member_code(gym_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    gym_name TEXT;
    prefix TEXT := '';
    next_seq INT;
    final_code TEXT;
    word TEXT;
BEGIN
    -- Get gym name
    SELECT name INTO gym_name FROM public.gyms WHERE id = gym_id_param;
    
    IF gym_name IS NULL OR gym_name = '' THEN
        prefix := 'GYM';
    ELSE
        -- Generate prefix from initials of gym name (up to 3 chars)
        FOR word IN SELECT regexp_split_to_table(gym_name, '\s+') LOOP
            IF length(word) > 0 THEN
                prefix := prefix || upper(substring(word from 1 for 1));
            END IF;
            EXIT WHEN length(prefix) >= 3;
        END LOOP;
        
        -- If prefix is too short, pad it
        IF length(prefix) < 2 THEN
            prefix := upper(substring(gym_name from 1 for 2));
        END IF;
    END IF;

    -- Clean prefix of any special characters
    prefix := regexp_replace(prefix, '[^A-Z]', 'G', 'g');

    -- Count existing members to get the next sequence
    -- Using count + 1 (can also use a sequence if required, but this is multi-tenant and sequential per gym)
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq 
    FROM public.members 
    WHERE gym_id = gym_id_param;

    -- Format code as PREFIX-0001
    final_code := prefix || '-' || lpad(next_seq::text, 4, '0');
    
    -- Check if it already exists (just in case of conflicts, increment if needed)
    WHILE EXISTS (SELECT 1 FROM public.members WHERE member_code = final_code) LOOP
        next_seq := next_seq + 1;
        final_code := prefix || '-' || lpad(next_seq::text, 4, '0');
    END LOOP;

    RETURN final_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- MIGRATION: 0006_staff_trainers.sql
-- ==========================================

-- Create Staff / Trainers Table
CREATE TABLE public.staff (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    specialization TEXT,
    schedule JSONB DEFAULT '{}'::jsonb NOT NULL,
    hire_date DATE DEFAULT current_date NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- MIGRATION: 0007_attendance.sql
-- ==========================================

-- Create Attendance Table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    method attendance_method DEFAULT 'qr_scan' NOT NULL,
    check_in_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    check_in_date DATE DEFAULT current_date NOT NULL,
    check_out_time TIMESTAMPTZ,
    duration INTEGER, -- duration in minutes
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_member_checkin_date UNIQUE (member_id, check_in_date)
);

-- Index for daily attendance queries
CREATE INDEX idx_attendance_gym_date ON public.attendance (gym_id, check_in_date);


-- ==========================================
-- MIGRATION: 0008_diet_workout_plans.sql
-- ==========================================

-- Create Diet Plans Table
CREATE TABLE public.diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    goal goal_type NOT NULL,
    daily_calories INT NOT NULL,
    meals JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Workout Plans Table
CREATE TABLE public.workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    goal goal_type NOT NULL,
    days_per_week INT NOT NULL,
    schedule JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Workout Completions Table
CREATE TABLE public.workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    day_name TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completion_date DATE DEFAULT current_date NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- MIGRATION: 0009_financial_invoices.sql
-- ==========================================

-- Create Invoices Table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    membership_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax_percent NUMERIC(5,2) DEFAULT 18.00 NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status invoice_status DEFAULT 'pending' NOT NULL,
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Function to generate invoice number: INV-YYYY-XXXX sequential per gym per year
CREATE OR REPLACE FUNCTION public.generate_invoice_number(gym_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_seq INT;
    final_number TEXT;
BEGIN
    current_year := to_char(now(), 'YYYY');

    -- Count existing invoices for this gym in the current year
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq
    FROM public.invoices
    WHERE gym_id = gym_id_param 
      AND to_char(created_at, 'YYYY') = current_year;

    -- Format INV-YYYY-XXXX
    final_number := 'INV-' || current_year || '-' || lpad(next_seq::text, 4, '0');

    -- Loop to prevent duplicate codes
    WHILE EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = final_number) LOOP
        next_seq := next_seq + 1;
        final_number := 'INV-' || current_year || '-' || lpad(next_seq::text, 4, '0');
    END LOOP;

    RETURN final_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Payment Reminders Table
CREATE TABLE public.payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_via TEXT NOT NULL, -- 'sms', 'email', 'push', 'in_app'
    message TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- MIGRATION: 0010_notices.sql
-- ==========================================

-- Create Notices Table
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority notice_priority DEFAULT 'normal' NOT NULL,
    target_role TEXT DEFAULT 'all' NOT NULL, -- 'all', 'member', 'trainer'
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- MIGRATION: 0011_body_stats_progress.sql
-- ==========================================

-- Create Body Stats Table
CREATE TABLE public.body_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    height_cm NUMERIC(5,2) NOT NULL,
    bmi NUMERIC(5,2),
    chest_cm NUMERIC(5,2),
    waist_cm NUMERIC(5,2),
    hips_cm NUMERIC(5,2),
    logged_at DATE DEFAULT current_date NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Progress Photos Table
CREATE TABLE public.progress_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    taken_at DATE DEFAULT current_date NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- MIGRATION: 0012_functions_and_triggers.sql
-- ==========================================

-- 1. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at trigger to all tables
CREATE TRIGGER trigger_update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_gyms_updated_at BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_gym_subscriptions_updated_at BEFORE UPDATE ON public.gym_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_diet_plans_updated_at BEFORE UPDATE ON public.diet_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_workout_completions_updated_at BEFORE UPDATE ON public.workout_completions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_payment_reminders_updated_at BEFORE UPDATE ON public.payment_reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_body_stats_updated_at BEFORE UPDATE ON public.body_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_progress_photos_updated_at BEFORE UPDATE ON public.progress_photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Function: get_user_role()
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
    u_role user_role;
BEGIN
    -- Query the public.profiles table for the authenticated user's role
    SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Function: get_user_gym_id()
CREATE OR REPLACE FUNCTION public.get_user_gym_id()
RETURNS UUID AS $$
DECLARE
    u_gym_id UUID;
BEGIN
    -- Query the public.profiles table for the authenticated user's gym_id
    SELECT gym_id INTO u_gym_id FROM public.profiles WHERE id = auth.uid();
    RETURN u_gym_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. Function: calculate_bmi() trigger
CREATE OR REPLACE FUNCTION public.calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        NEW.bmi := ROUND((NEW.weight_kg / ((NEW.height_cm / 100.0) * (NEW.height_cm / 100.0)))::numeric, 2);
    ELSE
        NEW.bmi := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calculate_bmi
BEFORE INSERT OR UPDATE OF weight_kg, height_cm ON public.body_stats
FOR EACH ROW EXECUTE FUNCTION public.calculate_bmi();

-- 9. Function: auto_expire_memberships()
CREATE OR REPLACE FUNCTION public.auto_expire_memberships()
RETURNS VOID AS $$
BEGIN
    UPDATE public.members
    SET status = 'expired'
    WHERE expiry_date < current_date 
      AND status = 'active' 
      AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function: auto_expire_trials()
CREATE OR REPLACE FUNCTION public.auto_expire_trials()
RETURNS VOID AS $$
BEGIN
    UPDATE public.gym_subscriptions
    SET status = 'expired'
    WHERE status = 'trial' 
      AND trial_ends_at < now() 
      AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- MIGRATION: 0013_rls_policies.sql
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Role protection trigger: Prevent role escalation by members/trainers
CREATE OR REPLACE FUNCTION public.protect_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Only super_admin can change roles
        IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'super_admin' THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Admins can modify roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_protect_role_escalation
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_role_escalation();


-- ==========================================
-- 1. PROFILES POLICIES
-- ==========================================
CREATE POLICY "Super Admins have full access to profiles" 
ON public.profiles FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin') 
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Users can read their own profile always" 
ON public.profiles FOR SELECT TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile fields (except role)" 
ON public.profiles FOR UPDATE TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Gym Owners can read and manage profiles in their gym" 
ON public.profiles FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers can read profiles in their gym" 
ON public.profiles FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');


-- ==========================================
-- 2. GYMS POLICIES
-- ==========================================
CREATE POLICY "Super Admins have full access to gyms" 
ON public.gyms FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners can read and update their gym" 
ON public.gyms FOR ALL TO authenticated 
USING (id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers can view their gym" 
ON public.gyms FOR SELECT TO authenticated 
USING (id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members can view their gym if active" 
ON public.gyms FOR SELECT TO authenticated 
USING (id = get_user_gym_id() AND get_user_role() = 'member' AND is_gym_active(id));


-- ==========================================
-- 3. SUBSCRIPTION PLANS POLICIES
-- ==========================================
CREATE POLICY "Everyone can view active subscription plans" 
ON public.subscription_plans FOR SELECT TO authenticated 
USING (is_active = true AND is_deleted = false);

CREATE POLICY "Super Admins manage subscription plans" 
ON public.subscription_plans FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');


-- ==========================================
-- 4. GYM SUBSCRIPTIONS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage gym subscriptions" 
ON public.gym_subscriptions FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners can view their gym subscriptions" 
ON public.gym_subscriptions FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');


-- ==========================================
-- 5. MEMBERSHIP PLANS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage membership plans" 
ON public.membership_plans FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage membership plans" 
ON public.membership_plans FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers can view membership plans" 
ON public.membership_plans FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members can view membership plans if gym active" 
ON public.membership_plans FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'member' AND is_gym_active(gym_id));


-- ==========================================
-- 6. MEMBERS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage members" 
ON public.members FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage members" 
ON public.members FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers can read members in gym" 
ON public.members FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members can view their own member details if active" 
ON public.members FOR SELECT TO authenticated 
USING (id = auth.uid() AND is_gym_active(gym_id));


-- ==========================================
-- 7. STAFF POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage staff" 
ON public.staff FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage staff" 
ON public.staff FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers can read staff details in gym" 
ON public.staff FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');


-- ==========================================
-- 8. ATTENDANCE POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage attendance" 
ON public.attendance FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage attendance" 
ON public.attendance FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers manage attendance" 
ON public.attendance FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members can view their own attendance if active" 
ON public.attendance FOR SELECT TO authenticated 
USING (member_id = auth.uid() AND is_gym_active(gym_id));

CREATE POLICY "Members can self check-in" 
ON public.attendance FOR INSERT TO authenticated 
WITH CHECK (member_id = auth.uid() AND scanned_by IS NULL AND method = 'self_checkin' AND is_gym_active(gym_id));


-- ==========================================
-- 9. DIET PLANS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage diet plans" 
ON public.diet_plans FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage diet plans" 
ON public.diet_plans FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers manage diet plans in gym" 
ON public.diet_plans FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members view own diet plan" 
ON public.diet_plans FOR SELECT TO authenticated 
USING (member_id = auth.uid() AND is_gym_active(gym_id));


-- ==========================================
-- 10. WORKOUT PLANS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage workout plans" 
ON public.workout_plans FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage workout plans" 
ON public.workout_plans FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers manage workout plans" 
ON public.workout_plans FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members view own workout plan" 
ON public.workout_plans FOR SELECT TO authenticated 
USING (member_id = auth.uid() AND is_gym_active(gym_id));


-- ==========================================
-- 11. WORKOUT COMPLETIONS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage workout completions" 
ON public.workout_completions FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners view completions" 
ON public.workout_completions FOR SELECT TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers view completions" 
ON public.workout_completions FOR SELECT TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members manage own completions" 
ON public.workout_completions FOR ALL TO authenticated 
USING (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)))
WITH CHECK (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)));


-- ==========================================
-- 12. INVOICES POLICIES (Members see invoices even if gym is inactive!)
-- ==========================================
CREATE POLICY "Super Admins manage invoices" 
ON public.invoices FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage invoices" 
ON public.invoices FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Members can view own invoices" 
ON public.invoices FOR SELECT TO authenticated 
USING (member_id = auth.uid());


-- ==========================================
-- 13. PAYMENT REMINDERS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage payment reminders" 
ON public.payment_reminders FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage payment reminders" 
ON public.payment_reminders FOR ALL TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Members view own reminders" 
ON public.payment_reminders FOR SELECT TO authenticated 
USING (member_id = auth.uid());


-- ==========================================
-- 14. NOTICES POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage notices" 
ON public.notices FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage notices" 
ON public.notices FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers read notices" 
ON public.notices FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'trainer' AND (target_role = 'all' OR target_role = 'trainer'));

CREATE POLICY "Members read notices" 
ON public.notices FOR SELECT TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'member' AND is_gym_active(gym_id) AND (target_role = 'all' OR target_role = 'member'));


-- ==========================================
-- 15. BODY STATS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage body stats" 
ON public.body_stats FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage body stats" 
ON public.body_stats FOR ALL TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers manage body stats" 
ON public.body_stats FOR ALL TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'trainer')
WITH CHECK ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'trainer');

CREATE POLICY "Members manage own body stats" 
ON public.body_stats FOR ALL TO authenticated 
USING (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)))
WITH CHECK (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)));


-- ==========================================
-- 16. PROGRESS PHOTOS POLICIES
-- ==========================================
CREATE POLICY "Super Admins manage progress photos" 
ON public.progress_photos FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners manage progress photos" 
ON public.progress_photos FOR ALL TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'gym_owner');

CREATE POLICY "Trainers view assigned progress photos" 
ON public.progress_photos FOR SELECT TO authenticated 
USING ((SELECT gym_id FROM public.members WHERE id = member_id) = get_user_gym_id() AND get_user_role() = 'trainer' AND (SELECT assigned_trainer_id FROM public.members WHERE id = member_id) = auth.uid());

CREATE POLICY "Members manage own progress photos" 
ON public.progress_photos FOR ALL TO authenticated 
USING (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)))
WITH CHECK (member_id = auth.uid() AND is_gym_active((SELECT gym_id FROM public.members WHERE id = member_id)));


-- ==========================================
-- STORAGE BUCKETS SETUP & POLICIES
-- ==========================================

-- Insert Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('gym-logos', 'gym-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('member-avatars', 'member-avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false) ON CONFLICT (id) DO NOTHING;

-- Enable storage policies
-- gym-logos policies
CREATE POLICY "Anyone can view gym logos" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym owners can upload logos to their folder" 
ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'gym-logos' AND (get_user_role() = 'gym_owner' OR get_user_role() = 'super_admin'))
WITH CHECK (bucket_id = 'gym-logos' AND (get_user_role() = 'gym_owner' OR get_user_role() = 'super_admin'));

-- member-avatars policies
CREATE POLICY "Anyone can view member avatars" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'member-avatars');

CREATE POLICY "Owners and trainers can upload avatars" 
ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'member-avatars' AND get_user_role() IN ('gym_owner', 'trainer', 'super_admin'))
WITH CHECK (bucket_id = 'member-avatars' AND get_user_role() IN ('gym_owner', 'trainer', 'super_admin'));

-- progress-photos policies (restricted)
CREATE POLICY "Progress photos access control" 
ON storage.objects FOR SELECT TO authenticated 
USING (
    bucket_id = 'progress-photos' AND (
        get_user_role() = 'super_admin' OR
        -- Check if gym owner of the member
        (get_user_role() = 'gym_owner' AND (SELECT gym_id FROM public.members WHERE id = (regexp_split_to_array(name, '/'))[1]::uuid) = get_user_gym_id()) OR
        -- Check if assigned trainer
        (get_user_role() = 'trainer' AND (SELECT assigned_trainer_id FROM public.members WHERE id = (regexp_split_to_array(name, '/'))[1]::uuid) = auth.uid()) OR
        -- Check if member themselves
        (get_user_role() = 'member' AND (regexp_split_to_array(name, '/'))[1]::uuid = auth.uid())
    )
);

CREATE POLICY "Members can upload their own progress photos" 
ON storage.objects FOR ALL TO authenticated 
USING (
    bucket_id = 'progress-photos' AND (
        get_user_role() = 'super_admin' OR
        (get_user_role() = 'member' AND (regexp_split_to_array(name, '/'))[1]::uuid = auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'progress-photos' AND (
        get_user_role() = 'super_admin' OR
        (get_user_role() = 'member' AND (regexp_split_to_array(name, '/'))[1]::uuid = auth.uid())
    )
);


-- ==========================================
-- MIGRATION: 0014_seed_demo_data.sql
-- ==========================================

-- Seed Subscription Plans (Sold by Super Admin to Gym Owners)
INSERT INTO public.subscription_plans (id, name, price, billing_cycle, max_members, max_trainers, max_gyms, features, is_highlighted, is_active, sort_order)
VALUES 
('1e1e1e1e-1e1e-1e1e-1e1e-1e1e1e1e1e1e', 'Starter', 999.00, 'monthly', 50, 3, 1, '["Basic QR Attendance", "Up to 50 Members", "3 Trainer Logins", "Email Support"]'::jsonb, false, true, 1),
('2e2e2e2e-2e2e-2e2e-2e2e-2e2e2e2e2e2e', 'Pro', 2499.00, 'monthly', 250, 10, 2, '["Standard QR Attendance", "Up to 250 Members", "10 Trainer Logins", "Invoicing & Reminders", "Announcements", "Priority Support"]'::jsonb, true, true, 2),
('3e3e3e3e-3e3e-3e3e-3e3e-3e3e3e3e3e3e', 'Enterprise', 4999.00, 'monthly', 1000, 30, 5, '["All Standard Features", "Up to 1000 Members", "30 Trainer Logins", "Locked Reception Kiosk Mode", "Multi-gym Owner Routing", "GST Invoicing & Reports", "Export Data (CSV)"]'::jsonb, false, true, 3)
ON CONFLICT (id) DO NOTHING;

/*
================================================================================
SEED DEMO DATA VIA TYPESCRIPT (RECOMMENDED APPROACH)
================================================================================

Since Auth Users cannot be inserted via direct SQL safely (without bypassing 
Supabase Auth hashing and security checks), you should run a TypeScript seed script.

We have created the seed script at `supabase/client/seed.ts`. 

To run the TypeScript seed script:
1. Make sure your environment variables are configured in `.env`:
   SUPABASE_URL="your-supabase-url"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" (WARNING: NEVER expose this on the client!)

2. Execute the seed script:
   cd supabase/client
   npm install ts-node @supabase/supabase-js
   npx ts-node seed.ts
*/


-- ==========================================
-- MIGRATION: 0015_remove_profile_auth_constraint.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 0016_expenses_rls.sql
-- ==========================================

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super Admins manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Gym Owners manage expenses" ON public.expenses;

-- Create Policy for Super Admin
CREATE POLICY "Super Admins manage expenses" 
ON public.expenses FOR ALL TO authenticated 
USING (get_user_role() = 'super_admin')
WITH CHECK (get_user_role() = 'super_admin');

-- Create Policy for Gym Owner
CREATE POLICY "Gym Owners manage expenses" 
ON public.expenses FOR ALL TO authenticated 
USING (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner')
WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'gym_owner');



