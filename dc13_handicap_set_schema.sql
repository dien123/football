-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor

-- 1. Add dc13_handicap_set column to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS dc13_handicap_set BOOLEAN DEFAULT FALSE;

-- 2. Mark existing matches that have already finished or have non-zero handicap or have bets as set
UPDATE public.matches 
SET dc13_handicap_set = TRUE 
WHERE status = 'finished' 
   OR dc13_status = 'finished' 
   OR dc13_handicap <> 0;
