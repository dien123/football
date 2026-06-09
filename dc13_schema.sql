-- ========================================================================
-- DC_13 Schema — Run this in Supabase SQL Editor
-- ========================================================================

-- 1. Bảng trận đấu DC_13
CREATE TABLE IF NOT EXISTS dc13_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  team_a_code TEXT,
  team_b_code TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',   -- 'scheduled', 'live', 'finished'
  result TEXT DEFAULT NULL,          -- 'teamA', 'teamB', 'draw' (đội thắng)
  betting_open BOOLEAN DEFAULT NULL, -- true=force open, false=force closed, null=auto
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng profile DC_13 (riêng biệt)
CREATE TABLE IF NOT EXISTS dc13_profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng bet DC_13
CREATE TABLE IF NOT EXISTS dc13_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES dc13_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES dc13_profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  chosen_team TEXT NOT NULL,          -- 'teamA' hoặc 'teamB'
  result TEXT DEFAULT 'pending',      -- 'pending', 'win', 'loss'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, user_id)           -- 1 user chỉ bet 1 lần/trận
);

-- ========================================================================
-- RLS Policies
-- ========================================================================
ALTER TABLE dc13_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc13_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc13_bets ENABLE ROW LEVEL SECURITY;

-- dc13_matches: public read/write (admin PIN protection in frontend)
DROP POLICY IF EXISTS "dc13_matches_all" ON dc13_matches;
CREATE POLICY "dc13_matches_all" ON dc13_matches FOR ALL USING (true) WITH CHECK (true);

-- dc13_profiles: public read/write
DROP POLICY IF EXISTS "dc13_profiles_all" ON dc13_profiles;
CREATE POLICY "dc13_profiles_all" ON dc13_profiles FOR ALL USING (true) WITH CHECK (true);

-- dc13_bets: public read/write
DROP POLICY IF EXISTS "dc13_bets_all" ON dc13_bets;
CREATE POLICY "dc13_bets_all" ON dc13_bets FOR ALL USING (true) WITH CHECK (true);
