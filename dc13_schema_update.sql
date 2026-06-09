-- ========================================================================
-- DC_13 Schema Update — Run this in Supabase SQL Editor
-- ========================================================================

-- Update foreign key constraint of dc13_bets to reference the main matches table instead of dc13_matches
ALTER TABLE dc13_bets DROP CONSTRAINT IF EXISTS dc13_bets_match_id_fkey;

ALTER TABLE dc13_bets ADD CONSTRAINT dc13_bets_match_id_fkey 
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
