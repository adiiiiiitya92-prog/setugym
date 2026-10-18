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
