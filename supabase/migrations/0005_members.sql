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
