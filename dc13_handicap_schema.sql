-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor

DO $$ 
BEGIN 
    -- DC13 Handicap (separate from outer handicap)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='dc13_handicap') THEN
        ALTER TABLE public.matches ADD COLUMN dc13_handicap NUMERIC DEFAULT 0;
    END IF;
    
    -- DC13 Favorite Team (separate from outer favorite_team)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='dc13_favorite_team') THEN
        ALTER TABLE public.matches ADD COLUMN dc13_favorite_team TEXT DEFAULT 'teamA';
    END IF;
END $$;
