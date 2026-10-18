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
