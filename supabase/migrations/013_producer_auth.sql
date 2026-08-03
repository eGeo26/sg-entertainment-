-- Migration 013: Producer Auth Table
-- Creates producer_auth table for hashed password storage with single seed row

CREATE TABLE IF NOT EXISTS public.producer_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial row if table is empty
INSERT INTO public.producer_auth (id, password_hash, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '$2b$10$rkbcjI7aMfERxH7kxpEFRuz83wTZFQLs618gLwDMYP95nJO7F8nWC', -- Initial hash for SG_Louder_Prod_2026!#
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.producer_auth);

-- Enable RLS and restrict access (service role key circumvents RLS)
ALTER TABLE public.producer_auth ENABLE ROW LEVEL SECURITY;
