-- Migration: Add Business Name, Company Website, and Email Address to employer_requirements
-- Ensures safe execution without altering or dropping existing records

ALTER TABLE public.employer_requirements 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_website VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Optional: Update existing records with default placeholder if null
UPDATE public.employer_requirements 
SET business_name = 'SSK Enterprise' 
WHERE business_name IS NULL OR business_name = '';

-- Optional index for faster searches by business name
CREATE INDEX IF NOT EXISTS idx_emp_business_name ON employer_requirements(business_name);
