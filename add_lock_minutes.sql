-- SQL MIGRATION FOR CUSTOM LOCK MINUTES THRESHOLD
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS lock_minutes INTEGER DEFAULT 30;
