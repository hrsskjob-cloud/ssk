-- ==============================================================================
-- SSK JOB NETWORK — SUPABASE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Initiative under SSK People Foundation
-- ==============================================================================
-- This complete script sets up all required tables, constraints, sequences,
-- indexes, triggers, row level security (RLS) policies, and admin accounts.
-- Safe to run in the Supabase SQL Editor (Idempotent / IF NOT EXISTS).
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. EMPLOYER REQUIREMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employer_requirements (
    id BIGSERIAL PRIMARY KEY,
    requirement_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contact_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position_name VARCHAR(255) NOT NULL,
    job_location VARCHAR(255) NOT NULL,
    qualification VARCHAR(255) NOT NULL,
    experience_required VARCHAR(100) NOT NULL,
    skills TEXT NOT NULL,
    job_description TEXT NOT NULL,
    salary_range VARCHAR(100) NOT NULL,
    hiring_deadline VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interview_date VARCHAR(50),
    interview_time VARCHAR(50),
    interview_mode VARCHAR(50),
    interview_remarks TEXT,
    offer_date VARCHAR(50),
    placement_date VARCHAR(50),
    annual_package NUMERIC(12, 2) DEFAULT 0,
    admin_notes TEXT,
    days_to_placement INTEGER
);

-- ==============================================================================
-- 2. EMPLOYEE / CANDIDATE PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_candidates (
    id BIGSERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    current_location VARCHAR(255) NOT NULL,
    qualification VARCHAR(255) NOT NULL,
    total_experience VARCHAR(100) NOT NULL,
    current_ctc VARCHAR(100),
    expected_ctc VARCHAR(100) NOT NULL,
    skills TEXT NOT NULL,
    immediate_joiner SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interview_date VARCHAR(50),
    interview_time VARCHAR(50),
    interview_mode VARCHAR(50),
    interview_remarks TEXT,
    offer_date VARCHAR(50),
    hired_date VARCHAR(50),
    annual_package NUMERIC(12, 2) DEFAULT 0,
    admin_notes TEXT
);

-- ==============================================================================
-- 3. STATUS HISTORY & AUDIT LOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.status_history (
    id BIGSERIAL PRIMARY KEY,
    record_type VARCHAR(20) NOT NULL, -- 'EMPLOYER' or 'CANDIDATE'
    record_id VARCHAR(50) NOT NULL,
    employer_id BIGINT REFERENCES public.employer_requirements(id) ON DELETE CASCADE,
    candidate_id BIGINT REFERENCES public.employee_candidates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'System',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT
);

-- ==============================================================================
-- 4. OTP SESSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.otp_sessions (
    mobile VARCHAR(20) PRIMARY KEY,
    otp VARCHAR(10) NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at BIGINT NOT NULL,
    last_sent_at BIGINT NOT NULL,
    verified_token VARCHAR(255),
    token_expires_at BIGINT
);

-- ==============================================================================
-- 5. ADMIN SESSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    token VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

-- ==============================================================================
-- 6. ADMIN USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    password TEXT NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- ==============================================================================
-- 7. PERFORMANCE & LOOKUP INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employer_mobile ON public.employer_requirements(mobile);
CREATE INDEX IF NOT EXISTS idx_employer_req_id ON public.employer_requirements(requirement_id);
CREATE INDEX IF NOT EXISTS idx_employer_status ON public.employer_requirements(status);

CREATE INDEX IF NOT EXISTS idx_candidate_mobile ON public.employee_candidates(mobile);
CREATE INDEX IF NOT EXISTS idx_candidate_id ON public.employee_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON public.employee_candidates(status);

CREATE INDEX IF NOT EXISTS idx_status_history_record ON public.status_history(record_id);
CREATE INDEX IF NOT EXISTS idx_admin_username ON public.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin_users(email);

-- ==============================================================================
-- 8. AUTOMATIC STATUS TIMESTAMP UPDATE TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        NEW.status_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employer_status_timestamp ON public.employer_requirements;
CREATE TRIGGER trigger_employer_status_timestamp
BEFORE UPDATE ON public.employer_requirements
FOR EACH ROW EXECUTE FUNCTION update_status_timestamp();

DROP TRIGGER IF EXISTS trigger_candidate_status_timestamp ON public.employee_candidates;
CREATE TRIGGER trigger_candidate_status_timestamp
BEFORE UPDATE ON public.employee_candidates
FOR EACH ROW EXECUTE FUNCTION update_status_timestamp();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable RLS on all application tables
ALTER TABLE public.employer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 9.1 SERVICE ROLE POLICIES (Full unrestricted access for Server-Side API)
DROP POLICY IF EXISTS "service_role_all_employer_requirements" ON public.employer_requirements;
CREATE POLICY "service_role_all_employer_requirements"
ON public.employer_requirements FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_employee_candidates" ON public.employee_candidates;
CREATE POLICY "service_role_all_employee_candidates"
ON public.employee_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_status_history" ON public.status_history;
CREATE POLICY "service_role_all_status_history"
ON public.status_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_otp_sessions" ON public.otp_sessions;
CREATE POLICY "service_role_all_otp_sessions"
ON public.otp_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_sessions" ON public.admin_sessions;
CREATE POLICY "service_role_all_admin_sessions"
ON public.admin_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_users" ON public.admin_users;
CREATE POLICY "service_role_all_admin_users"
ON public.admin_users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9.2 PUBLIC / ANON POLICIES (Client web access)
-- Public can read employer requirements & candidates for aggregated statistics & status tracking
DROP POLICY IF EXISTS "anon_select_employer_requirements" ON public.employer_requirements;
CREATE POLICY "anon_select_employer_requirements"
ON public.employer_requirements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employer_requirements" ON public.employer_requirements;
CREATE POLICY "anon_insert_employer_requirements"
ON public.employer_requirements FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_employee_candidates" ON public.employee_candidates;
CREATE POLICY "anon_select_employee_candidates"
ON public.employee_candidates FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employee_candidates" ON public.employee_candidates;
CREATE POLICY "anon_insert_employee_candidates"
ON public.employee_candidates FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_status_history" ON public.status_history;
CREATE POLICY "anon_select_status_history"
ON public.status_history FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_status_history" ON public.status_history;
CREATE POLICY "anon_insert_status_history"
ON public.status_history FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_employer_requirements" ON public.employer_requirements;
CREATE POLICY "authenticated_update_employer_requirements"
ON public.employer_requirements FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_employee_candidates" ON public.employee_candidates;
CREATE POLICY "authenticated_update_employee_candidates"
ON public.employee_candidates FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_otp_sessions" ON public.otp_sessions;
CREATE POLICY "anon_all_otp_sessions"
ON public.otp_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- STRICT SECURITY: anon and authenticated roles have NO direct access to admin_users or admin_sessions!
-- Authentication is managed safely through the server /api/admin/login endpoint.

-- ==============================================================================
-- 9.3 POSTGRES ROLE PERMISSIONS & SEQUENCE GRANTS
-- ==============================================================================
-- Ensure PostgREST roles have required schema and sequence privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employer_requirements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_candidates TO anon, authenticated;
GRANT SELECT, INSERT ON public.status_history TO anon, authenticated;
GRANT ALL ON public.otp_sessions TO anon, authenticated;

-- Critical sequence access for BIGSERIAL auto-increment IDs
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Routine / function permissions
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Future table defaults
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- ==============================================================================
-- 10. SEED DESIGNATED ADMIN ACCOUNT
-- ==============================================================================
-- Creates administrator account:
-- Email/Username: hrsskjon@gmail.com
-- Password: Welcome@123
INSERT INTO public.admin_users (
    username,
    email,
    password,
    password_hash,
    full_name,
    role,
    is_active
) VALUES 
(
    'hrsskjon@gmail.com',
    'hrsskjon@gmail.com',
    'Welcome@123',
    'Welcome@123',
    'SSK Platform Administrator',
    'super_admin',
    TRUE
),
(
    'hrsskjon',
    'hrsskjon@gmail.com',
    'Welcome@123',
    'Welcome@123',
    'SSK Platform Administrator',
    'super_admin',
    TRUE
),
(
    'hrsskjob@gmail.com',
    'hrsskjob@gmail.com',
    'Welcome@123',
    'Welcome@123',
    'SSK Platform Administrator',
    'super_admin',
    TRUE
),
(
    'hrsskjob',
    'hrsskjob@gmail.com',
    'Welcome@123',
    'Welcome@123',
    'SSK Platform Administrator',
    'super_admin',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 11. INITIAL SEED DATA FOR COMMUNITY METRICS (OPTIONAL / ON CONFLICT IGNORED)
-- ==============================================================================
INSERT INTO public.employer_requirements (
    requirement_id, contact_name, mobile, job_title, department, position_name,
    job_location, qualification, experience_required, skills, job_description,
    salary_range, hiring_deadline, status, submitted_at, status_updated_at,
    interview_date, interview_time, interview_mode, offer_date, placement_date,
    annual_package, admin_notes, days_to_placement
) VALUES 
(
    'SSKJ-E-00001', 'Suresh Khatri (Khatri Textiles)', '9845012345', 'Senior Accounts Executive',
    'Finance & Accounts', 'Senior Accountant', 'Chickpet, Bengaluru', 'B.Com / M.Com / Inter CA',
    '4-6 Years', 'Tally Prime, GST filing, TDS, Bank Reconciliation, MS Excel',
    'Looking for an experienced accountant from SSK community for textile retail and wholesale firm.',
    '₹35,000 - ₹45,000 / month', '2026-10-15', 'Placement Successful',
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days',
    '2026-08-18', '11:00 AM', 'In-Person', '2026-08-22', '2026-08-25',
    480000, 'Placed candidate Rajesh Pawar successfully. Good feedback from employer.', 15
),
(
    'SSKJ-E-00002', 'Mahesh Kalburgi (Kalburgi Silks)', '9880198765', 'Store Supervisor & Billing In-charge',
    'Retail Operations', 'Store Supervisor', 'Hubballi Main Market, Hubballi', 'Any Degree / Diploma',
    '2-4 Years', 'Inventory management, POS billing, Staff supervision, Customer handling',
    'Supervise daily showroom operations, manage cash desk and customer relations.',
    '₹22,000 - ₹28,000 / month', '2026-09-30', 'Interview Scheduled',
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '4 days',
    '2026-09-20', '02:30 PM', 'In-Person', NULL, NULL,
    300000, 'Shortlisted 2 candidates from Hubballi. Interview scheduled for 20th Sep.', NULL
)
ON CONFLICT (requirement_id) DO NOTHING;

INSERT INTO public.employee_candidates (
    candidate_id, full_name, mobile, email, current_location, qualification,
    total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
    status, applied_at, status_updated_at, interview_date, interview_time,
    interview_mode, offer_date, hired_date, annual_package, admin_notes
) VALUES
(
    'SSKJ-C-00001', 'Rajesh Pawar', '9845099881', 'rajesh.pawar@example.com',
    'Bengaluru, Karnataka', 'M.Com (Finance)', '5 Years', '₹4,20,000 PA', '₹4,80,000 PA',
    'Tally Prime, GST, TDS, Finalization of Accounts', 1, 'Hired',
    NOW() - INTERVAL '28 days', NOW() - INTERVAL '15 days',
    '2026-08-18', '11:00 AM', 'In-Person', '2026-08-22', '2026-08-25',
    480000, 'Placed at Khatri Textiles Chickpet. Joined successfully.'
),
(
    'SSKJ-C-00002', 'Santosh Habib', '9988776655', 'santosh.habib@example.com',
    'Bengaluru, Karnataka', 'BE in Computer Science', '3 Years', '₹5,50,000 PA', '₹7,00,000 - ₹7,50,000 PA',
    'React, Node.js, TypeScript, PostgreSQL, Tailwind', 1, 'Offer Letter',
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '2 days',
    '2026-09-08', '04:00 PM', 'Online', '2026-09-15', NULL,
    720000, 'Offer letter issued by Baddi Digital Solutions. Reviewing terms.'
)
ON CONFLICT (candidate_id) DO NOTHING;
