-- Create Feedbacks Table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super Admins can view all feedbacks" 
ON public.feedbacks FOR SELECT TO authenticated 
USING (get_user_role() = 'super_admin');

CREATE POLICY "Gym Owners can create feedbacks" 
ON public.feedbacks FOR INSERT TO authenticated 
WITH CHECK (get_user_role() = 'gym_owner');

CREATE POLICY "Gym Owners can view their own feedbacks" 
ON public.feedbacks FOR SELECT TO authenticated 
USING (user_id = auth.uid());
