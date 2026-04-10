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

-- 4. Create KANBAN TASKS Table
-- Stores your internal project management tasks
CREATE TABLE IF NOT EXISTS public.kanban_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in-progress', 'review', 'done', 'archived')),
    priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to UUID REFERENCES public.app_users(id),
    created_by UUID REFERENCES public.app_users(id),
    due_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create APP_USERS Table (for admin-managed user accounts)
-- This stores user credentials managed by the admin
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user')),
    category TEXT DEFAULT 'Staff' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Set Up ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

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

-- POLICY: Admin (Authenticated) can view/manage KANBAN TASKS
CREATE POLICY "Admin: Full control of kanban tasks"
ON public.kanban_tasks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- POLICY: Allow public (anon) to SELECT/INSERT/UPDATE app_users
-- (The app handles auth logic in-app, not via Supabase auth)
CREATE POLICY "Public: Full access to app_users"
ON public.app_users FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 7. SEED DATA (Default Reports)
INSERT INTO public.reports (problem, description, possible_error, suggested_solution, frequency, icon, estimated_cost, is_custom)
VALUES 
('PC not turning on', 'Device fails to power up.', 'Loose cable, PSU failure, motherboard issues.', 'Check connections, outlet, PSU test.', '85% (High)', 'MonitorOff', '$50 - $150', false),
('No internet connection', 'Unable to access network.', 'Router/Modem, ISP, password, drivers.', 'Restart router, toggle Wi-Fi, flush DNS.', '92% (Very High)', 'WifiOff', 'Free (In-house fix)', false);

-- SEED DATA (Default Kanban Tasks)
INSERT INTO public.kanban_tasks (title, description, status, priority)
VALUES 
('Implement AI Diagnosis', 'Integrate Gemini API for technical troubleshooting.', 'in-progress', 'high'),
('Add Kanban Board', 'Create a visual project management tool.', 'todo', 'medium'),
('System Deployment', 'Prepare for production release.', 'todo', 'high'),
('UI Refinement', 'Polish macOS styles and transitions.', 'done', 'low');

-- SEED DATA (Default Admin User)
-- Username: risingtech | Password: rising@tech@innovations
INSERT INTO public.app_users (username, password, full_name, email, role)
VALUES 
('risingtech', 'rising@tech@innovations', 'Rising Tech Admin', 'admin@risingtech.innovation', 'admin');

-- 8. Create MESSENGER MESSAGES Table
CREATE TABLE IF NOT EXISTS public.messenger_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    sender_id UUID REFERENCES public.app_users(id),
    sender_name TEXT NOT NULL,
    receiver_id UUID, -- NULL for Team Global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;

-- 9. Create MEETING SIGNALS Table (WebRTC Signaling)
CREATE TABLE IF NOT EXISTS public.meeting_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.app_users(id),
    receiver_id UUID, -- NULL for broadcast/initial offer
    type TEXT NOT NULL, -- 'offer', 'answer', 'candidate'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meeting_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public: Full access to signals"
ON public.meeting_signals FOR ALL
TO public
USING (true)
WITH CHECK (true);
