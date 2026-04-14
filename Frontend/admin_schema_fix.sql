-- SQL FIX FOR ADMIN SAVE ISSUE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- 1. Ensure all columns exist in 'matches' table
DO $$ 
BEGIN 
    -- Team A/B Flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='team_a_code') THEN
        ALTER TABLE public.matches ADD COLUMN team_a_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='team_b_code') THEN
        ALTER TABLE public.matches ADD COLUMN team_b_code text;
    END IF;

    -- Icons (if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='team_a_icon') THEN
        ALTER TABLE public.matches ADD COLUMN team_a_icon text DEFAULT '⚽';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='team_b_icon') THEN
        ALTER TABLE public.matches ADD COLUMN team_b_icon text DEFAULT '⚽';
    END IF;

    -- Favorite Team (Asian Handicap logic)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='favorite_team') THEN
        ALTER TABLE public.matches ADD COLUMN favorite_team text DEFAULT 'teamA';
    END IF;

    -- Commentary & Metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='commentator') THEN
        ALTER TABLE public.matches ADD COLUMN commentator text DEFAULT 'Chưa có BLV';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='stadium') THEN
        ALTER TABLE public.matches ADD COLUMN stadium text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='league') THEN
        ALTER TABLE public.matches ADD COLUMN league text DEFAULT 'FIFA WORLD CUP 2026';
    END IF;
END $$;

-- 2. Open up RLS for Admin operations
-- Since we use a local PIN system, we need the DB to allow updates from client-side requests.
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "Allow all for anon" ON public.matches;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.matches;

-- Create a catch-all policy for matches (Public or Authenticated)
CREATE POLICY "Enable all access for all users" 
ON public.matches 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Also check profiles (if you have them) to make sure they don't block anything
-- If you use authentication, ensure regular users can't delete matches if they know the ID, 
-- but for simplicity in development, current policy is set to 'true'.
