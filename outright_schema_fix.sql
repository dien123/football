-- SQL FIX FOR OUTRIGHT BETS & WINNERS RLS POLICIES
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)
-- This fixes the issue where DELETE/UPDATE requests succeed on the client but do not persist in the database due to missing RLS policies.

-- 1. Enable RLS on outright_bets and outright_winner tables
ALTER TABLE public.outright_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outright_winner ENABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting existing policies
DROP POLICY IF EXISTS "Enable all access for all users" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow all access to outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow public read for outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow public insert for outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow owner delete for outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow owner update for outright_bets" ON public.outright_bets;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow all access to outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow public read for outright_winner" ON public.outright_winner;

-- 3. Create a clean catch-all policy allowing ALL operations (SELECT, INSERT, UPDATE, DELETE) for all users.
-- Since our React frontend strictly enforces user ownership (matching b.user_id) and Admin privileges (via the PIN system),
-- this keeps the database layer simple, robust, and aligned with matches/bets tables.
CREATE POLICY "Allow all access to outright_bets" 
ON public.outright_bets 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Create a clean catch-all policy for outright_winner
CREATE POLICY "Allow all access to outright_winner" 
ON public.outright_winner 
FOR ALL 
USING (true) 
WITH CHECK (true);
