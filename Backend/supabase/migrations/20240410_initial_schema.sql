-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  team_a_icon TEXT, -- emoji or URL
  team_b_icon TEXT, -- emoji or URL
  stadium TEXT,
  league TEXT,
  start_time TIMESTAMPTZ,
  commentator TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
  handicap NUMERIC DEFAULT 0,
  rate_a NUMERIC DEFAULT 85,
  rate_b NUMERIC DEFAULT 90,
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  favorite_team TEXT DEFAULT 'teamA',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  option TEXT NOT NULL, -- 'teamA', 'teamB'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Create policies (Allowing all for now as it's a demo/local test, but can be restricted)
CREATE POLICY "Allow public read for matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read for bets" ON bets FOR SELECT USING (true);
CREATE POLICY "Allow public insert for bets" ON bets FOR INSERT WITH CHECK (true);

-- Seed World Cup 2026 data
INSERT INTO matches (team_a_name, team_b_name, team_a_icon, team_b_icon, stadium, league, start_time, commentator, status, handicap, rate_a, rate_b)
VALUES 
('Việt Nam', 'Thái Lan', '🇻🇳', '🇹🇭', 'Sân Mỹ Đình', 'World Cup 2026 - Vòng Bảng', '2026-06-15 19:00:00+07', 'BLV Quang Huy', 'scheduled', 0.25, 90, 85),
('Mỹ', 'Mexico', '🇺🇸', '🇲🇽', 'SoFi Stadium', 'World Cup 2026 - Vòng Bảng', '2026-06-16 08:00:00+07', 'BLV Anh Quân', 'scheduled', 0, 95, 95),
('Đức', 'Pháp', '🇩🇪', '🇫🇷', 'MetLife Stadium', 'World Cup 2026 - Vòng Bảng', '2026-06-17 02:00:00+07', 'BLV Tạ Biên Cương', 'scheduled', 0.5, 80, 100),
('Nhật Bản', 'Hàn Quốc', '🇯🇵', '🇰🇷', 'AT&T Stadium', 'World Cup 2026 - Vòng Bảng', '2026-06-18 17:00:00+07', 'BLV Bun Cha', 'scheduled', 0, 90, 90),
('Brazil', 'Argentina', '🇧🇷', '🇦🇷', 'Azteca Stadium', 'World Cup 2026 - Vòng Bảng', '2026-06-19 09:00:00+07', 'BLV Quốc Anh', 'live', 0.25, 85, 95);
