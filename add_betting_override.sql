-- SQL MIGRATION FOR MANUAL BETTING OVERRIDE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- 1. Ensure the betting_open column exists in 'matches' table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS betting_open BOOLEAN DEFAULT NULL;

-- 2. Make sure it allows NULL values (so we can use NULL for Auto/Real-time behavior)
ALTER TABLE public.matches ALTER COLUMN betting_open DROP NOT NULL;
ALTER TABLE public.matches ALTER COLUMN betting_open SET DEFAULT NULL;
