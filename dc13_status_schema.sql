-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor

DO $$ 
BEGIN 
    -- DC13 Status (separate from outer status)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='dc13_status') THEN
        ALTER TABLE public.matches ADD COLUMN dc13_status TEXT DEFAULT 'scheduled';
    END IF;
    
    -- DC13 Score A (separate from outer score_a)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='dc13_score_a') THEN
        ALTER TABLE public.matches ADD COLUMN dc13_score_a INT DEFAULT 0;
    END IF;

    -- DC13 Score B (separate from outer score_b)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='dc13_score_b') THEN
        ALTER TABLE public.matches ADD COLUMN dc13_score_b INT DEFAULT 0;
    END IF;
END $$;
