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
