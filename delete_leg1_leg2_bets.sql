-- ========================================================================
-- CLEAN UP LEG 1 & LEG 2 BET DATA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)
-- ========================================================================

-- 1. Xóa các lượt bet của những trận đấu diễn ra trước 18h ngày 24/06/2026
DELETE FROM public.bets 
WHERE match_id IN (
  SELECT id FROM public.matches 
  WHERE start_time < '2026-06-24T18:00:00+07:00'
);

-- 2. Xóa lịch sử thay đổi cược của những trận đấu trước mốc thời gian trên
DELETE FROM public.bet_logs 
WHERE match_id IN (
  SELECT id FROM public.matches 
  WHERE start_time < '2026-06-24T18:00:00+07:00'
);
