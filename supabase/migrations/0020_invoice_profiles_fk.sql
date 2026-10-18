-- Migration: 0020_invoice_profiles_fk.sql
-- Alter public.invoices and public.payment_reminders to reference public.profiles(id) instead of public.members(id)

-- 1. Drop existing constraints referencing public.members(id)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_member_id_fkey;
ALTER TABLE public.payment_reminders DROP CONSTRAINT IF EXISTS payment_reminders_member_id_fkey;

-- 2. Add new constraints referencing public.profiles(id)
ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.payment_reminders 
  ADD CONSTRAINT payment_reminders_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
