-- ---------------------------------------------------------
-- Supabase SQL Editor Script for Rising Tech Innovations --
-- ---------------------------------------------------------

-- 1. Create CLIENT COMPLAINTS Table
-- Stores user data from the public landing page form
CREATE TABLE IF NOT EXISTS public.client_complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
    problem TEXT NOT NULL,
    type TEXT DEFAULT 'complaint' NOT NULL, -- 'complaint' or 'website'
    category TEXT DEFAULT 'company' NOT NULL, -- 'student', 'organization', or 'company'
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'resolved', 'in-progress')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create TROUBLESHOOTING REPORTS Table
-- Stores your AI-generated and default report templates
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    problem TEXT NOT NULL,
    description TEXT NOT NULL,
    possible_error TEXT NOT NULL,
    suggested_solution TEXT NOT NULL,
    frequency TEXT NOT NULL,
    icon TEXT DEFAULT 'Zap' NOT NULL,
    estimated_cost TEXT,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create EMAIL DISPATCH LOGS Table
-- Audit trail of every email you send via SMTP
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    complainant_name TEXT NOT NULL,
    problem TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Set Up ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_complaints ENABLE ROW LEVEL SECURITY;

-- POLICY: Public visitors can ONLY INSERT their complaints
CREATE POLICY "Public: Can submit complaints"
ON public.client_complaints FOR INSERT 
TO public
WITH CHECK (true);

-- POLICY: Admin (Authenticated) can view/manage CLIENT COMPLAINTS
CREATE POLICY "Admin: Full control of complaints"
ON public.client_complaints FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- POLICY: Admin (Authenticated) can view/manage REPORTS
CREATE POLICY "Admin: Full control of reports"
ON public.reports FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- POLICY: Admin (Authenticated) can view/manage EMAIL LOGS
CREATE POLICY "Admin: Full control of email logs"
ON public.email_logs FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. SEED DATA (Default Reports)
INSERT INTO public.reports (problem, description, possible_error, suggested_solution, frequency, icon, estimated_cost, is_custom)
VALUES 
('PC not turning on', 'Device fails to power up.', 'Loose cable, PSU failure, motherboard issues.', 'Check connections, outlet, PSU test.', '85% (High)', 'MonitorOff', '$50 - $150', false),
('No internet connection', 'Unable to access network.', 'Router/Modem, ISP, password, drivers.', 'Restart router, toggle Wi-Fi, flush DNS.', '92% (Very High)', 'WifiOff', 'Free (In-house fix)', false);
