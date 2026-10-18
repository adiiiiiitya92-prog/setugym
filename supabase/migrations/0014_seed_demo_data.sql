-- Seed Subscription Plans (Sold by Super Admin to Gym Owners)
INSERT INTO public.subscription_plans (id, name, price, billing_cycle, max_members, max_trainers, max_gyms, features, is_highlighted, is_active, sort_order)
VALUES 
('1e1e1e1e-1e1e-1e1e-1e1e-1e1e1e1e1e1e', 'Starter', 999.00, 'monthly', 50, 3, 1, '["Basic QR Attendance", "Up to 50 Members", "3 Trainer Logins", "Email Support"]'::jsonb, false, true, 1),
('2e2e2e2e-2e2e-2e2e-2e2e-2e2e2e2e2e2e', 'Pro', 2499.00, 'monthly', 250, 10, 2, '["Standard QR Attendance", "Up to 250 Members", "10 Trainer Logins", "Invoicing & Reminders", "Announcements", "Priority Support"]'::jsonb, true, true, 2),
('3e3e3e3e-3e3e-3e3e-3e3e-3e3e3e3e3e3e', 'Enterprise', 4999.00, 'monthly', 1000, 30, 5, '["All Standard Features", "Up to 1000 Members", "30 Trainer Logins", "Locked Reception Kiosk Mode", "Multi-gym Owner Routing", "GST Invoicing & Reports", "Export Data (CSV)"]'::jsonb, false, true, 3)
ON CONFLICT (id) DO NOTHING;

/*
================================================================================
SEED DEMO DATA VIA TYPESCRIPT (RECOMMENDED APPROACH)
================================================================================

Since Auth Users cannot be inserted via direct SQL safely (without bypassing 
Supabase Auth hashing and security checks), you should run a TypeScript seed script.

We have created the seed script at `supabase/client/seed.ts`. 

To run the TypeScript seed script:
1. Make sure your environment variables are configured in `.env`:
   SUPABASE_URL="your-supabase-url"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" (WARNING: NEVER expose this on the client!)

2. Execute the seed script:
   cd supabase/client
   npm install ts-node @supabase/supabase-js
   npx ts-node seed.ts
*/
