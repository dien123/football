-- ========================================================================
-- DC_13 Outright Betting Schema — Run this in Supabase SQL Editor
-- ========================================================================

-- 1. Create dc13_outright_bets table
CREATE TABLE IF NOT EXISTS public.dc13_outright_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.dc13_profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create dc13_outright_winner table
CREATE TABLE IF NOT EXISTS public.dc13_outright_winner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.dc13_outright_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc13_outright_winner ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "dc13_outright_bets_all" ON public.dc13_outright_bets;
CREATE POLICY "dc13_outright_bets_all" ON public.dc13_outright_bets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dc13_outright_winner_all" ON public.dc13_outright_winner;
CREATE POLICY "dc13_outright_winner_all" ON public.dc13_outright_winner FOR ALL USING (true) WITH CHECK (true);
