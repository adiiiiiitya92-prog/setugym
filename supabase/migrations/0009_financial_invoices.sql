-- Create Invoices Table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
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
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_via TEXT NOT NULL, -- 'sms', 'email', 'push', 'in_app'
    message TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
