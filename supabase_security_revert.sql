-- ========================================================================
-- SUPABASE SECURITY & RLS REVERT MIGRATION
-- Run this in your Supabase SQL Editor to UNDO all security changes
-- ========================================================================

-- ========================================================================
-- 1. Bảng public.matches
-- ========================================================================
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for matches" ON public.matches;
DROP POLICY IF EXISTS "Allow admin all for matches" ON public.matches;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "Enable all access for all users" ON public.matches;
CREATE POLICY "Enable all access for all users" ON public.matches FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 2. Bảng public.bets
-- ========================================================================
ALTER TABLE public.bets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can modify their own bets" ON public.bets;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "Allow public read for bets" ON public.bets;
DROP POLICY IF EXISTS "Allow public insert for bets" ON public.bets;
CREATE POLICY "Allow public read for bets" ON public.bets FOR SELECT USING (true);
CREATE POLICY "Allow public insert for bets" ON public.bets FOR INSERT WITH CHECK (true);

-- Xóa ràng buộc điểm cược 50k - 1M
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS check_bet_amount;


-- ========================================================================
-- 3. Bảng public.refunds
-- ========================================================================
ALTER TABLE public.refunds DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own refunds or admin can view all" ON public.refunds;
DROP POLICY IF EXISTS "Allow admin all for refunds" ON public.refunds;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "Allow public read for refunds" ON public.refunds;
DROP POLICY IF EXISTS "Allow public insert for refunds" ON public.refunds;
CREATE POLICY "Allow public read for refunds" ON public.refunds FOR SELECT USING (true);
CREATE POLICY "Allow public insert for refunds" ON public.refunds FOR INSERT WITH CHECK (true);


-- ========================================================================
-- 4. Bảng public.profiles
-- ========================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 5. Bảng public.dc13_matches
-- ========================================================================
ALTER TABLE public.dc13_matches DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for dc13_matches" ON public.dc13_matches;
DROP POLICY IF EXISTS "Allow admin all for dc13_matches" ON public.dc13_matches;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "dc13_matches_all" ON public.dc13_matches;
CREATE POLICY "dc13_matches_all" ON public.dc13_matches FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 6. Bảng public.dc13_bets
-- ========================================================================
ALTER TABLE public.dc13_bets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view dc13 bets" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can insert their own dc13 bets" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can modify their own dc13 bets" ON public.dc13_bets;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "dc13_bets_all" ON public.dc13_bets;
CREATE POLICY "dc13_bets_all" ON public.dc13_bets FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 7. Bảng public.dc13_profiles
-- ========================================================================
ALTER TABLE public.dc13_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for dc13_profiles" ON public.dc13_profiles;
DROP POLICY IF EXISTS "Allow users to update own dc13 profile" ON public.dc13_profiles;

-- Tạo lại policy mở hoàn toàn như cũ
DROP POLICY IF EXISTS "dc13_profiles_all" ON public.dc13_profiles;
CREATE POLICY "dc13_profiles_all" ON public.dc13_profiles FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 8. Bảng public.outright_winner & outright_bets
-- ========================================================================
ALTER TABLE public.outright_winner DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outright_bets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow admin all for outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow public read for outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow users/admin all for outright_bets" ON public.outright_bets;

-- Tạo lại các policy mở như ban đầu
DROP POLICY IF EXISTS "Allow all access to outright_winner" ON public.outright_winner;
CREATE POLICY "Allow all access to outright_winner" ON public.outright_winner FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to outright_bets" ON public.outright_bets;
CREATE POLICY "Allow all access to outright_bets" ON public.outright_bets FOR ALL USING (true) WITH CHECK (true);


-- ========================================================================
-- 9. Bảng public.dc13_outright_winner & dc13_outright_bets
-- ========================================================================
ALTER TABLE public.dc13_outright_winner DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc13_outright_bets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for dc13_outright_winner" ON public.dc13_outright_winner;
DROP POLICY IF EXISTS "Allow admin all for dc13_outright_winner" ON public.dc13_outright_winner;
DROP POLICY IF EXISTS "Allow public read for dc13_outright_bets" ON public.dc13_outright_bets;
DROP POLICY IF EXISTS "Allow users/admin all for dc13_outright_bets" ON public.dc13_outright_bets;

-- Tạo lại các policy mở như ban đầu
DROP POLICY IF EXISTS "dc13_outright_winner_all" ON public.dc13_outright_winner;
CREATE POLICY "dc13_outright_winner_all" ON public.dc13_outright_winner FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dc13_outright_bets_all" ON public.dc13_outright_bets;
CREATE POLICY "dc13_outright_bets_all" ON public.dc13_outright_bets FOR ALL USING (true) WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
