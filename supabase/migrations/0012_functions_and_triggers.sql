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
