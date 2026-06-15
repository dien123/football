-- SQL MIGRATION FOR VOUCHER REFUNDS SYSTEM
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- 1. Create public.refunds table to store refund logs
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  refunded_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for public access (SELECT and INSERT)
CREATE POLICY "Allow public read for refunds" ON public.refunds FOR SELECT USING (true);
CREATE POLICY "Allow public insert for refunds" ON public.refunds FOR INSERT WITH CHECK (true);

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
