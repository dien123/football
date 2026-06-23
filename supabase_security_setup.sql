-- ========================================================================
-- SUPABASE SECURITY & RLS MIGRATION
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)
-- ========================================================================

-- ========================================================================
-- 1. Bảng public.matches (Thông tin trận đấu ngoài trang chủ)
-- ========================================================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for matches" ON public.matches;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.matches;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "Allow all for anon" ON public.matches;

-- Ai cũng có thể xem trận đấu
CREATE POLICY "Allow public read for matches" 
ON public.matches 
FOR SELECT 
USING (true);

-- Chỉ Admin (email phuongdien997@gmail.com) mới được Thêm/Sửa/Xóa trận đấu
CREATE POLICY "Allow admin all for matches" 
ON public.matches 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 2. Bảng public.bets (Thông tin cược ngoài trang chủ)
-- ========================================================================
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for bets" ON public.bets;
DROP POLICY IF EXISTS "Allow public insert for bets" ON public.bets;
DROP POLICY IF EXISTS "Allow owner delete for bets" ON public.bets;
DROP POLICY IF EXISTS "Allow owner update for bets" ON public.bets;
DROP POLICY IF EXISTS "Users can modify their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can view others' bets only after match starts" ON public.bets;
DROP POLICY IF EXISTS "Users can view bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;

-- Đọc cược: Admin được xem tất cả, User được xem cược của mình, hoặc xem cược của người khác sau khi trận đấu đã bắt đầu
CREATE POLICY "Users can view bets" 
ON public.bets 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.matches 
    WHERE public.matches.id = public.bets.match_id 
    AND public.matches.start_time <= NOW()
  )
);

-- Thêm cược: User chỉ được đặt cược cho chính mình và chỉ khi trận đấu chưa bắt đầu
CREATE POLICY "Users can insert their own bets" 
ON public.bets 
FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches 
      WHERE public.matches.id = match_id 
      AND public.matches.start_time > NOW()
    )
  )
);

-- Sửa/Xóa cược: User chỉ được sửa/xóa cược của chính mình và chỉ khi trận đấu chưa bắt đầu
CREATE POLICY "Users can modify their own bets" 
ON public.bets 
FOR ALL 
USING (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches 
      WHERE public.matches.id = match_id 
      AND public.matches.start_time > NOW()
    )
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches 
      WHERE public.matches.id = match_id 
      AND public.matches.start_time > NOW()
    )
  )
);

-- Ràng buộc số tiền cược từ 50 điểm đến 1000 điểm (50.000đ - 1.000.000đ) tại database
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS check_bet_amount;
ALTER TABLE public.bets ADD CONSTRAINT check_bet_amount CHECK (amount >= 50000 AND amount <= 1000000);


-- ========================================================================
-- 3. Bảng public.refunds (Lịch sử hoàn tiền/insurance ngoài trang chủ)
-- ========================================================================
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for refunds" ON public.refunds;
DROP POLICY IF EXISTS "Allow public insert for refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can only view their own refunds or admin can view all" ON public.refunds;
DROP POLICY IF EXISTS "Allow admin all for refunds" ON public.refunds;

-- Đọc dữ liệu: Chỉ Admin hoặc chính user đó mới được xem lịch sử hoàn tiền (Tránh lộ số dư/tổng hoàn của hệ thống)
CREATE POLICY "Users can only view their own refunds or admin can view all" 
ON public.refunds 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR user_name = (auth.jwt() -> 'user_metadata' ->> 'full_name')
);

-- Thêm/Sửa/Xóa hoàn tiền: Chỉ Admin mới được thực hiện
CREATE POLICY "Allow admin all for refunds" 
ON public.refunds 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 4. Bảng public.profiles (Profile người dùng)
-- ========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

CREATE POLICY "Allow public read for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR ALL USING (auth.uid() = id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 5. Bảng public.dc13_matches (Thông tin trận đấu DC13)
-- ========================================================================
ALTER TABLE public.dc13_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc13_matches_all" ON public.dc13_matches;
DROP POLICY IF EXISTS "Allow public read for dc13_matches" ON public.dc13_matches;
DROP POLICY IF EXISTS "Allow admin all for dc13_matches" ON public.dc13_matches;

CREATE POLICY "Allow public read for dc13_matches" ON public.dc13_matches FOR SELECT USING (true);
CREATE POLICY "Allow admin all for dc13_matches" ON public.dc13_matches FOR ALL USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 6. Bảng public.dc13_bets (Thông tin cược DC13)
-- ========================================================================
ALTER TABLE public.dc13_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc13_bets_all" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can modify their own dc13 bets" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can view others' dc13 bets only after match starts" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can view dc13 bets" ON public.dc13_bets;
DROP POLICY IF EXISTS "Users can insert their own dc13 bets" ON public.dc13_bets;

-- Đọc cược DC13
CREATE POLICY "Users can view dc13 bets" 
ON public.dc13_bets 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.dc13_matches 
    WHERE public.dc13_matches.id = public.dc13_bets.match_id 
    AND public.dc13_matches.start_time <= NOW()
  )
);

-- Thêm cược DC13: Chỉ khi trận đấu chưa bắt đầu
CREATE POLICY "Users can insert their own dc13 bets" 
ON public.dc13_bets 
FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dc13_matches 
      WHERE public.dc13_matches.id = match_id 
      AND public.dc13_matches.start_time > NOW()
    )
  )
);

-- Sửa/Xóa cược DC13: Chỉ khi trận đấu chưa bắt đầu
CREATE POLICY "Users can modify their own dc13 bets" 
ON public.dc13_bets 
FOR ALL 
USING (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dc13_matches 
      WHERE public.dc13_matches.id = match_id 
      AND public.dc13_matches.start_time > NOW()
    )
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'phuongdien997@gmail.com'
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dc13_matches 
      WHERE public.dc13_matches.id = match_id 
      AND public.dc13_matches.start_time > NOW()
    )
  )
);


-- ========================================================================
-- 7. Bảng public.dc13_profiles (Profile người dùng DC13)
-- ========================================================================
ALTER TABLE public.dc13_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc13_profiles_all" ON public.dc13_profiles;
DROP POLICY IF EXISTS "Allow public read for dc13_profiles" ON public.dc13_profiles;
DROP POLICY IF EXISTS "Allow users to update own dc13 profile" ON public.dc13_profiles;

CREATE POLICY "Allow public read for dc13_profiles" ON public.dc13_profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own dc13 profile" ON public.dc13_profiles FOR ALL USING (auth.uid() = id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 8. Bảng public.outright_winner & outright_bets (Vô địch ngoài trang chủ)
-- ========================================================================
ALTER TABLE public.outright_winner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outright_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow all access to outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow public read for outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow admin all for outright_winner" ON public.outright_winner;
DROP POLICY IF EXISTS "Allow public read for outright_bets" ON public.outright_bets;
DROP POLICY IF EXISTS "Allow users/admin all for outright_bets" ON public.outright_bets;

-- outright_winner: Xem tự do, Admin sửa
CREATE POLICY "Allow public read for outright_winner" ON public.outright_winner FOR SELECT USING (true);
CREATE POLICY "Allow admin all for outright_winner" ON public.outright_winner FOR ALL USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');

-- outright_bets: Xem tự do, Sửa của chính mình
CREATE POLICY "Allow public read for outright_bets" ON public.outright_bets FOR SELECT USING (true);
CREATE POLICY "Allow users/admin all for outright_bets" ON public.outright_bets FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');


-- ========================================================================
-- 9. Bảng public.dc13_outright_winner & dc13_outright_bets (Vô địch DC13)
-- ========================================================================
ALTER TABLE public.dc13_outright_winner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc13_outright_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc13_outright_winner_all" ON public.dc13_outright_winner;
DROP POLICY IF EXISTS "dc13_outright_bets_all" ON public.dc13_outright_bets;
DROP POLICY IF EXISTS "Allow public read for dc13_outright_winner" ON public.dc13_outright_winner;
DROP POLICY IF EXISTS "Allow admin all for dc13_outright_winner" ON public.dc13_outright_winner;
DROP POLICY IF EXISTS "Allow public read for dc13_outright_bets" ON public.dc13_outright_bets;
DROP POLICY IF EXISTS "Allow users/admin all for dc13_outright_bets" ON public.dc13_outright_bets;

-- dc13_outright_winner: Xem tự do, Admin sửa
CREATE POLICY "Allow public read for dc13_outright_winner" ON public.dc13_outright_winner FOR SELECT USING (true);
CREATE POLICY "Allow admin all for dc13_outright_winner" ON public.dc13_outright_winner FOR ALL USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');

-- dc13_outright_bets: Xem tự do, Sửa của chính mình
CREATE POLICY "Allow public read for dc13_outright_bets" ON public.dc13_outright_bets FOR SELECT USING (true);
CREATE POLICY "Allow users/admin all for dc13_outright_bets" ON public.dc13_outright_bets FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com') WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
