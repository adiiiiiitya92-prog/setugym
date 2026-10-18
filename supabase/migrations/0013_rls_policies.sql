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
