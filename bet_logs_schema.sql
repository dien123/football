-- ========================================================================
-- SQL SCHEMA FOR BET LOGS & AUDIT TRAIL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)
-- ========================================================================

-- 1. Tạo bảng bet_logs để lưu lịch sử đặt cược và thay đổi
CREATE TABLE IF NOT EXISTS public.bet_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  bet_id UUID NOT NULL,
  user_id UUID,
  user_name TEXT NOT NULL,
  option TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  action TEXT NOT NULL, -- 'INSERT' hoặc 'UPDATE'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kích hoạt Row Level Security (RLS) cho bảng bet_logs
ALTER TABLE public.bet_logs ENABLE ROW LEVEL SECURITY;

-- 3. Chỉ cho phép Admin (email phuongdien997@gmail.com) đọc và xóa lịch sử cược
DROP POLICY IF EXISTS "Allow admin all for bet_logs" ON public.bet_logs;
CREATE POLICY "Allow admin all for bet_logs" 
ON public.bet_logs 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'phuongdien997@gmail.com');

-- 4. Hàm trigger tự động ghi lịch sử khi bảng bets có thay đổi (INSERT hoặc UPDATE)
CREATE OR REPLACE FUNCTION public.log_bet_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.bet_logs (match_id, bet_id, user_id, user_name, option, amount, action)
  VALUES (
    NEW.match_id,
    NEW.id,
    NEW.user_id,
    NEW.user_name,
    NEW.option,
    NEW.amount,
    TG_OP -- Sẽ là 'INSERT' hoặc 'UPDATE'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tạo trigger trên bảng bets
DROP TRIGGER IF EXISTS trigger_log_bets ON public.bets;
CREATE TRIGGER trigger_log_bets
AFTER INSERT OR UPDATE ON public.bets
FOR EACH ROW
EXECUTE FUNCTION public.log_bet_changes();

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
