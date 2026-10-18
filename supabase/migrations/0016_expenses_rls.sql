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
